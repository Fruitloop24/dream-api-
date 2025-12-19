/**
 * useProjects - Manages projects list and platform ID generation
 */

import { useState, useCallback } from 'react';
import { useAuth } from '@clerk/clerk-react';
import type { Project } from '@/constants';

const FRONT_AUTH_API = import.meta.env.VITE_FRONT_AUTH_API_URL || 'http://localhost:8788';

export function useProjects() {
  const { getToken } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [platformId, setPlatformId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  /** Generate platform ID on first login */
  const generatePlatformId = useCallback(async () => {
    try {
      const token = await getToken({ template: 'dream-api' });
      const res = await fetch(`${FRONT_AUTH_API}/generate-platform-id`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      return res.ok;
    } catch (err) {
      console.error('[useProjects] Platform ID error:', err);
      return false;
    }
  }, [getToken]);

  /** Load all projects for this platform */
  const loadProjects = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getToken({ template: 'dream-api' });
      const res = await fetch(`${FRONT_AUTH_API}/projects`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!res.ok) {
        console.error('[useProjects] Projects failed:', res.status);
        return [];
      }
      const data = await res.json();
      setPlatformId(data.platformId);
      const list: Project[] = data.projects || [];
      setProjects(list);
      return list;
    } catch (err) {
      console.error('[useProjects] Projects error:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  /** Delete a project by name */
  const deleteProject = useCallback(async (projectName: string) => {
    try {
      const token = await getToken({ template: 'dream-api' });
      const res = await fetch(`${FRONT_AUTH_API}/projects/delete`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ projectName }),
      });
      if (res.ok) {
        setProjects(prev => prev.filter(p => p.name !== projectName));
        return { success: true };
      }
      const err = await res.json();
      return { success: false, error: err.error || 'Failed to delete project' };
    } catch (err) {
      console.error('[useProjects] Delete error:', err);
      return { success: false, error: 'Failed to delete project' };
    }
  }, [getToken]);

  /** Regenerate secret key for a project */
  const regenerateSecret = useCallback(async (publishableKey: string) => {
    try {
      const token = await getToken({ template: 'dream-api' });
      const res = await fetch(`${FRONT_AUTH_API}/projects/regenerate-secret`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ publishableKey }),
      });
      if (res.ok) {
        const data = await res.json();
        return { success: true, secretKey: data.secretKey };
      }
      const err = await res.json();
      return { success: false, error: err.error || 'Failed to regenerate secret' };
    } catch (err) {
      console.error('[useProjects] Regenerate error:', err);
      return { success: false, error: 'Failed to regenerate secret' };
    }
  }, [getToken]);

  return {
    projects,
    platformId,
    loading,
    generatePlatformId,
    loadProjects,
    deleteProject,
    regenerateSecret,
    setProjects,
  };
}
