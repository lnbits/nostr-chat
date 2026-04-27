import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('desktopRuntime', {
  isElectron: true,
  platform: process.platform,
  setUnreadChatBadge: (count: number, label: string) => {
    ipcRenderer.send('desktop:set-unread-chat-badge', { count, label });
  },
  showIncomingMessageNotification: (input: { chatPubkey: string; title: string; body: string }) => {
    ipcRenderer.send('desktop:show-incoming-message-notification', input);
  },
  onOpenChatFromNotification: (listener: (chatPubkey: string) => void) => {
    const wrappedListener = (_event: unknown, payload: unknown) => {
      if (
        !payload ||
        typeof payload !== 'object' ||
        Array.isArray(payload) ||
        typeof (payload as Record<string, unknown>).chatPubkey !== 'string'
      ) {
        return;
      }

      listener((payload as Record<string, string>).chatPubkey);
    };

    ipcRenderer.on('desktop:open-chat-from-notification', wrappedListener);
    return () => {
      ipcRenderer.removeListener('desktop:open-chat-from-notification', wrappedListener);
    };
  },
});
