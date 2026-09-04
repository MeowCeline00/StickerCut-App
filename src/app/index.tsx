import { router, useFocusEffect } from "expo-router";

import { useCallback, useState } from "react";

import { Alert, FlatList, Text, TouchableOpacity, View } from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";

import { deleteProject, loadProjects } from "@/storage/projectStorage";

import { styles } from "@/styles/index.styles";

import type { StickerProject } from "@/types/project";

export default function HomeScreen() {
  const [projects, setProjects] = useState<StickerProject[]>([]);

  const [loading, setLoading] = useState(true);

  // Reload the project list every time this screen
  // regains focus, e.g. after Save in the editor or
  // after backing out of New Project.
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      async function refresh() {
        const stored = await loadProjects();

        if (!cancelled) {
          setProjects(stored);

          setLoading(false);
        }
      }

      refresh();

      return () => {
        cancelled = true;
      };
    }, []),
  );

  function handleNewProject() {
    router.push("/new-project");
  }

  function handleOpenProject(project: StickerProject) {
    router.push({
      pathname: "/editor",

      params: {
        projectId: project.id,
      },
    });
  }

  function handleDeleteProject(project: StickerProject) {
    Alert.alert(
      "Delete project",
      `Delete "${project.name}"? This cannot be undone.`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await deleteProject(project.id);

            setProjects((current) =>
              current.filter((existing) => existing.id !== project.id),
            );
          },
        },
      ],
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <View>
            <Text style={styles.headerCode}>CUT LINE</Text>

            <Text style={styles.title}>My Projects</Text>
          </View>

          <TouchableOpacity style={styles.newButton} onPress={handleNewProject}>
            <Text style={styles.newButtonText}>+ New</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.centerFill}>
            <Text style={styles.loadingText}>LOADING PROJECTS...</Text>
          </View>
        ) : projects.length === 0 ? (
          <View style={styles.centerFill}>
            <Text style={styles.emptyIcon}>✂</Text>

            <Text style={styles.emptyTitle}>NO PROJECTS YET</Text>

            <Text style={styles.emptyText}>
              Tap + New to start your first sticker sheet
            </Text>
          </View>
        ) : (
          <FlatList
            data={projects}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.card}
                activeOpacity={0.85}
                onPress={() => handleOpenProject(item)}
              >
                <View style={styles.cardThumb}>
                  <Text style={styles.cardThumbIcon}>✂</Text>
                </View>

                <View style={styles.cardInfo}>
                  <Text style={styles.cardName} numberOfLines={1}>
                    {item.name}
                  </Text>

                  <Text style={styles.cardMeta}>
                    {item.canvas.widthMm}
                    {" × "}
                    {item.canvas.heightMm}
                    {" mm · "}
                    {item.stickers.length}
                    {" sticker"}
                    {item.stickers.length !== 1 ? "s" : ""}
                  </Text>

                  <Text style={styles.cardDate}>
                    {new Date(item.updatedAt).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => handleDeleteProject(item)}
                >
                  <Text style={styles.deleteButtonText}>×</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            )}
          />
        )}
      </View>
    </SafeAreaView>
  );
}
