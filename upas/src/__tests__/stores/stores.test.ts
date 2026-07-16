/**
 * UPAS — Store Initialization Tests
 * Sprint 1: Verify Zustand stores initialize correctly
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useProjectStore } from '../../stores/projectStore';
import { useUIStore } from '../../stores/uiStore';

describe('projectStore', () => {
  beforeEach(() => {
    useProjectStore.getState().resetProjectState();
  });

  it('should initialize with empty state', () => {
    const state = useProjectStore.getState();
    expect(state.currentProject).toBeNull();
    expect(state.threats).toEqual([]);
    expect(state.bombs).toEqual([]);
    expect(state.soilProfile).toBeNull();
    expect(state.structure).toBeNull();
    expect(state.analysisResults).toEqual([]);
    expect(state.visualizationSettings).toBeNull();
    expect(state.projects).toEqual([]);
  });

  it('should create a new project', () => {
    const project = useProjectStore.getState().createNewProject('مشروع اختبار', 'وصف');
    expect(project.id).toBeTruthy();
    expect(project.name).toBe('مشروع اختبار');
    expect(project.description).toBe('وصف');

    // Store should reflect the new project
    const state = useProjectStore.getState();
    expect(state.currentProject).toEqual(project);
    expect(state.projects).toHaveLength(1);
    expect(state.visualizationSettings).toBeTruthy();
  });

  it('should update project fields', () => {
    useProjectStore.getState().createNewProject('مشروع');
    useProjectStore.getState().updateProject({ name: 'مشروع محدث', location: 'الرياض' });

    const state = useProjectStore.getState();
    expect(state.currentProject?.name).toBe('مشروع محدث');
    expect(state.currentProject?.location).toBe('الرياض');
  });

  it('should add and remove threats', () => {
    useProjectStore.getState().createNewProject();
    useProjectStore.getState().addThreat({
      id: 'threat-1',
      projectId: 'x',
      name: 'تهديد',
      description: '',
      type: 'external' as any,
      position: { x: 0, y: 0, z: 0 },
      standoffDistance: { value: 10, unit: 'm' },
      detonationType: 'surface',
      burialDepth: null,
      probabilityLevel: 5,
      notes: '',
    });

    expect(useProjectStore.getState().threats).toHaveLength(1);

    useProjectStore.getState().removeThreat('threat-1');
    expect(useProjectStore.getState().threats).toHaveLength(0);
  });

  it('should reset state completely', () => {
    useProjectStore.getState().createNewProject('مشروع');
    useProjectStore.getState().resetProjectState();

    const state = useProjectStore.getState();
    expect(state.currentProject).toBeNull();
    expect(state.projects).toEqual([]);
  });
});

describe('uiStore', () => {
  beforeEach(() => {
    // Reset UI state
    const store = useUIStore.getState();
    useUIStore.setState({
      activeView: 'dashboard',
      sidebarOpen: true,
      isGlobalLoading: false,
      notifications: [],
      sceneReady: false,
      sceneFPS: 0,
    });
  });

  it('should initialize with dashboard view', () => {
    expect(useUIStore.getState().activeView).toBe('dashboard');
    expect(useUIStore.getState().sidebarOpen).toBe(true);
  });

  it('should switch views', () => {
    useUIStore.getState().setActiveView('new-project');
    expect(useUIStore.getState().activeView).toBe('new-project');

    useUIStore.getState().setActiveView('analysis');
    expect(useUIStore.getState().activeView).toBe('analysis');
  });

  it('should toggle sidebar', () => {
    expect(useUIStore.getState().sidebarOpen).toBe(true);
    useUIStore.getState().toggleSidebar();
    expect(useUIStore.getState().sidebarOpen).toBe(false);
    useUIStore.getState().toggleSidebar();
    expect(useUIStore.getState().sidebarOpen).toBe(true);
  });

  it('should add and auto-dismiss notifications', () => {
    useUIStore.getState().addNotification('test message', 'info');
    expect(useUIStore.getState().notifications).toHaveLength(1);
    expect(useUIStore.getState().notifications[0]!.message).toBe('test message');
  });

  it('should dismiss notifications', () => {
    useUIStore.getState().addNotification('to dismiss', 'warning');
    const id = useUIStore.getState().notifications[0]!.id;
    useUIStore.getState().dismissNotification(id);
    expect(useUIStore.getState().notifications).toHaveLength(0);
  });
});