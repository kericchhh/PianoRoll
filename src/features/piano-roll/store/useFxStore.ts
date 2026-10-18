import { create } from 'zustand';
import {
    DEFAULT_FX_SETTINGS,
    parseFxSettings,
    type FxSettings,
} from '@/features/piano-roll/audio/fxSettings';

type FxState = {
    settings: FxSettings;
    setSettings: (settings: FxSettings) => void;
};

export const useFxStore = create<FxState>((set) => ({
    settings: parseFxSettings(DEFAULT_FX_SETTINGS),
    setSettings: (settings) => set({ settings: parseFxSettings(settings) }),
}));
