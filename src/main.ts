import { createApp } from 'vue';
import App from './App.vue';
import ElementPlus from 'element-plus';
import 'element-plus/dist/index.css';
import { applyDemoMapGlobalConfig } from './demo-map-global-config';

/**
 * 应用启动前先注册 demo 全局默认配置。
 * 这样 main.ts 只负责启动流程，配置本身集中在独立文件中维护。
 */
applyDemoMapGlobalConfig();

createApp(App).use(ElementPlus).mount('#app');
