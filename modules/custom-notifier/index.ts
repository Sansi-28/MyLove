import CustomNotifier from './src/CustomNotifierModule';

export async function displayCustomNotification(title: string, body: string, imageUrl: string) {
  if (CustomNotifier && typeof CustomNotifier.displayCustomNotification === 'function') {
    return await CustomNotifier.displayCustomNotification(title, body, imageUrl);
  }
}

export default CustomNotifier;
