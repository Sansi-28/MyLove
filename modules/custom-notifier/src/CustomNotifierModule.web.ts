import { registerWebModule, NativeModule } from 'expo';

class CustomNotifierModule extends NativeModule<{}> {}

export default registerWebModule(CustomNotifierModule, 'CustomNotifierModule');
