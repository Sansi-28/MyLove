import { NativeModule, requireNativeModule } from 'expo';

declare class CustomNotifierModule extends NativeModule<{}> {}

export default requireNativeModule<CustomNotifierModule>('CustomNotifier');
