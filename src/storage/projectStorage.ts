import AsyncStorage from '@react-native-async-storage/async-storage';

import type { StickerProject } from '@/types/project';

const PROJECTS_KEY = 'stickercut_projects_v1';

export async function loadProjects(): Promise<StickerProject[]> {
  try {
    const raw = await AsyncStorage.getItem(PROJECTS_KEY);

    if (!raw) {
      return [];
    }

    const projects = JSON.parse(raw) as StickerProject[];

    return projects.sort(
      (a, b) => b.updatedAt - a.updatedAt
    );
  } catch (error) {
    console.error(
      'Failed to load StickerCut projects:',
      error
    );

    return [];
  }
}

export async function getProject(
  projectId: string
): Promise<StickerProject | null> {
  const projects = await loadProjects();

  return (
    projects.find(
      project => project.id === projectId
    ) ?? null
  );
}

export async function saveProject(
  project: StickerProject
): Promise<void> {
  try {
    const projects = await loadProjects();

    const updatedProject: StickerProject = {
      ...project,
      updatedAt: Date.now(),
    };

    const nextProjects = [
      updatedProject,

      ...projects.filter(
        existing =>
          existing.id !== updatedProject.id
      ),
    ];

    await AsyncStorage.setItem(
      PROJECTS_KEY,
      JSON.stringify(nextProjects)
    );
  } catch (error) {
    console.error(
      'Failed to save StickerCut project:',
      error
    );

    throw error;
  }
}

export async function deleteProject(
  projectId: string
): Promise<void> {
  try {
    const projects = await loadProjects();

    const remainingProjects =
      projects.filter(
        project =>
          project.id !== projectId
      );

    await AsyncStorage.setItem(
      PROJECTS_KEY,
      JSON.stringify(remainingProjects)
    );
  } catch (error) {
    console.error(
      'Failed to delete StickerCut project:',
      error
    );

    throw error;
  }
}