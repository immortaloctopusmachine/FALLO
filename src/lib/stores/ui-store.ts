import { create } from 'zustand';

type ModalType = 'card' | 'createCard' | 'createList' | 'boardSettings' | null;
type BoardView = 'tasks' | 'epics';

interface UIStore {
  // Modal state
  activeModal: ModalType;
  activeCardId: string | null;
  openCardModal: (cardId: string) => void;
  openModal: (modal: ModalType) => void;
  closeModal: () => void;

  // Sidebar state
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;

  // Board view
  boardView: BoardView;
  setBoardView: (view: BoardView) => void;

  // Drag state
  isDragging: boolean;
  setIsDragging: (dragging: boolean) => void;
}

export const useUIStore = create<UIStore>((set) => ({
  // Modal state
  activeModal: null,
  activeCardId: null,
  openCardModal: (cardId) => set({ activeModal: 'card', activeCardId: cardId }),
  openModal: (modal) => set({ activeModal: modal, activeCardId: null }),
  closeModal: () => set({ activeModal: null, activeCardId: null }),

  // Sidebar state
  sidebarCollapsed: false,
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

  // Board view
  boardView: 'tasks',
  setBoardView: (view) => set({ boardView: view }),

  // Drag state
  isDragging: false,
  setIsDragging: (dragging) => set({ isDragging: dragging }),
}));
