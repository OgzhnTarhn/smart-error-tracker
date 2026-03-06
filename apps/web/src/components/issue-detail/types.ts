export const EVENT_TABS = ['stack', 'context', 'raw'] as const;
export type EventTab = (typeof EVENT_TABS)[number];
