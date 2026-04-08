import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface Project {
  id: string;
  name: string;
  status: "intake" | "building" | "deploying" | "deployed" | "failed";
  platform: string;
  createdAt: string;
}

interface ProjectState {
  projects: Project[];
  activeProject: Project | null;
  loading: boolean;
}

const initialState: ProjectState = {
  projects: [],
  activeProject: null,
  loading: false,
};

const projectSlice = createSlice({
  name: "projects",
  initialState,
  reducers: {
    setProjects(state, action: PayloadAction<Project[]>) {
      state.projects = action.payload;
    },
    setActiveProject(state, action: PayloadAction<Project | null>) {
      state.activeProject = action.payload;
    },
    setLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload;
    },
  },
});

export const { setProjects, setActiveProject, setLoading } =
  projectSlice.actions;
export default projectSlice.reducer;
