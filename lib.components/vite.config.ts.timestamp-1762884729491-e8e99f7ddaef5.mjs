// vite.config.ts
import react from "file:///home/user/adopt-dont-shop/node_modules/@vitejs/plugin-react/dist/index.js";
import { resolve } from "path";
import { defineConfig } from "file:///home/user/adopt-dont-shop/node_modules/vite/dist/node/index.js";
import dts from "file:///home/user/adopt-dont-shop/node_modules/vite-plugin-dts/dist/index.mjs";
var __vite_injected_original_dirname = "/home/user/adopt-dont-shop/lib.components";
var vite_config_default = defineConfig(({ mode }) => ({
  plugins: [
    react(),
    dts({
      insertTypesEntry: true
    })
  ],
  // Development server setup for standalone component development
  server: {
    port: 3010,
    host: "0.0.0.0"
  },
  // Only apply library build config in production mode
  ...mode === "production" && {
    build: {
      lib: {
        entry: resolve(__vite_injected_original_dirname, "src/index.ts"),
        name: "AdoptDontShopComponents",
        formats: ["es", "umd"],
        fileName: (format) => `adopt-dont-shop-components.${format}.js`
      },
      rollupOptions: {
        external: [
          "react",
          "react-dom",
          "styled-components",
          "@radix-ui/react-tooltip",
          "@radix-ui/react-dropdown-menu",
          "@radix-ui/react-select",
          "@radix-ui/react-dialog",
          "@radix-ui/react-checkbox",
          "@radix-ui/react-radio-group",
          "@radix-ui/react-switch",
          "@radix-ui/react-tabs",
          "clsx",
          "react-world-flags"
        ],
        output: {
          globals: {
            react: "React",
            "react-dom": "ReactDOM",
            "styled-components": "styled",
            "@radix-ui/react-tooltip": "RadixTooltip",
            "@radix-ui/react-dropdown-menu": "RadixDropdownMenu",
            "@radix-ui/react-select": "RadixSelect",
            "@radix-ui/react-dialog": "RadixDialog",
            "@radix-ui/react-checkbox": "RadixCheckbox",
            "@radix-ui/react-radio-group": "RadixRadioGroup",
            "@radix-ui/react-switch": "RadixSwitch",
            "@radix-ui/react-tabs": "RadixTabs",
            clsx: "clsx",
            "react-world-flags": "ReactWorldFlags"
          }
        }
      }
    }
  }
}));
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvaG9tZS91c2VyL2Fkb3B0LWRvbnQtc2hvcC9saWIuY29tcG9uZW50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiL2hvbWUvdXNlci9hZG9wdC1kb250LXNob3AvbGliLmNvbXBvbmVudHMvdml0ZS5jb25maWcudHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL2hvbWUvdXNlci9hZG9wdC1kb250LXNob3AvbGliLmNvbXBvbmVudHMvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgcmVhY3QgZnJvbSAnQHZpdGVqcy9wbHVnaW4tcmVhY3QnO1xyXG5pbXBvcnQgeyByZXNvbHZlIH0gZnJvbSAncGF0aCc7XHJcbmltcG9ydCB7IGRlZmluZUNvbmZpZyB9IGZyb20gJ3ZpdGUnO1xyXG5pbXBvcnQgZHRzIGZyb20gJ3ZpdGUtcGx1Z2luLWR0cyc7XHJcblxyXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoKHsgbW9kZSB9KSA9PiAoe1xyXG4gIHBsdWdpbnM6IFtcclxuICAgIHJlYWN0KCksXHJcbiAgICBkdHMoe1xyXG4gICAgICBpbnNlcnRUeXBlc0VudHJ5OiB0cnVlLFxyXG4gICAgfSksXHJcbiAgXSxcclxuXHJcbiAgLy8gRGV2ZWxvcG1lbnQgc2VydmVyIHNldHVwIGZvciBzdGFuZGFsb25lIGNvbXBvbmVudCBkZXZlbG9wbWVudFxyXG4gIHNlcnZlcjoge1xyXG4gICAgcG9ydDogMzAxMCxcclxuICAgIGhvc3Q6ICcwLjAuMC4wJyxcclxuICB9LFxyXG5cclxuICAvLyBPbmx5IGFwcGx5IGxpYnJhcnkgYnVpbGQgY29uZmlnIGluIHByb2R1Y3Rpb24gbW9kZVxyXG4gIC4uLihtb2RlID09PSAncHJvZHVjdGlvbicgJiYge1xyXG4gICAgYnVpbGQ6IHtcclxuICAgICAgbGliOiB7XHJcbiAgICAgICAgZW50cnk6IHJlc29sdmUoX19kaXJuYW1lLCAnc3JjL2luZGV4LnRzJyksXHJcbiAgICAgICAgbmFtZTogJ0Fkb3B0RG9udFNob3BDb21wb25lbnRzJyxcclxuICAgICAgICBmb3JtYXRzOiBbJ2VzJywgJ3VtZCddLFxyXG4gICAgICAgIGZpbGVOYW1lOiBmb3JtYXQgPT4gYGFkb3B0LWRvbnQtc2hvcC1jb21wb25lbnRzLiR7Zm9ybWF0fS5qc2AsXHJcbiAgICAgIH0sXHJcbiAgICAgIHJvbGx1cE9wdGlvbnM6IHtcclxuICAgICAgICBleHRlcm5hbDogW1xyXG4gICAgICAgICAgJ3JlYWN0JyxcclxuICAgICAgICAgICdyZWFjdC1kb20nLFxyXG4gICAgICAgICAgJ3N0eWxlZC1jb21wb25lbnRzJyxcclxuICAgICAgICAgICdAcmFkaXgtdWkvcmVhY3QtdG9vbHRpcCcsXHJcbiAgICAgICAgICAnQHJhZGl4LXVpL3JlYWN0LWRyb3Bkb3duLW1lbnUnLFxyXG4gICAgICAgICAgJ0ByYWRpeC11aS9yZWFjdC1zZWxlY3QnLFxyXG4gICAgICAgICAgJ0ByYWRpeC11aS9yZWFjdC1kaWFsb2cnLFxyXG4gICAgICAgICAgJ0ByYWRpeC11aS9yZWFjdC1jaGVja2JveCcsXHJcbiAgICAgICAgICAnQHJhZGl4LXVpL3JlYWN0LXJhZGlvLWdyb3VwJyxcclxuICAgICAgICAgICdAcmFkaXgtdWkvcmVhY3Qtc3dpdGNoJyxcclxuICAgICAgICAgICdAcmFkaXgtdWkvcmVhY3QtdGFicycsXHJcbiAgICAgICAgICAnY2xzeCcsXHJcbiAgICAgICAgICAncmVhY3Qtd29ybGQtZmxhZ3MnLFxyXG4gICAgICAgIF0sXHJcbiAgICAgICAgb3V0cHV0OiB7XHJcbiAgICAgICAgICBnbG9iYWxzOiB7XHJcbiAgICAgICAgICAgIHJlYWN0OiAnUmVhY3QnLFxyXG4gICAgICAgICAgICAncmVhY3QtZG9tJzogJ1JlYWN0RE9NJyxcclxuICAgICAgICAgICAgJ3N0eWxlZC1jb21wb25lbnRzJzogJ3N0eWxlZCcsXHJcbiAgICAgICAgICAgICdAcmFkaXgtdWkvcmVhY3QtdG9vbHRpcCc6ICdSYWRpeFRvb2x0aXAnLFxyXG4gICAgICAgICAgICAnQHJhZGl4LXVpL3JlYWN0LWRyb3Bkb3duLW1lbnUnOiAnUmFkaXhEcm9wZG93bk1lbnUnLFxyXG4gICAgICAgICAgICAnQHJhZGl4LXVpL3JlYWN0LXNlbGVjdCc6ICdSYWRpeFNlbGVjdCcsXHJcbiAgICAgICAgICAgICdAcmFkaXgtdWkvcmVhY3QtZGlhbG9nJzogJ1JhZGl4RGlhbG9nJyxcclxuICAgICAgICAgICAgJ0ByYWRpeC11aS9yZWFjdC1jaGVja2JveCc6ICdSYWRpeENoZWNrYm94JyxcclxuICAgICAgICAgICAgJ0ByYWRpeC11aS9yZWFjdC1yYWRpby1ncm91cCc6ICdSYWRpeFJhZGlvR3JvdXAnLFxyXG4gICAgICAgICAgICAnQHJhZGl4LXVpL3JlYWN0LXN3aXRjaCc6ICdSYWRpeFN3aXRjaCcsXHJcbiAgICAgICAgICAgICdAcmFkaXgtdWkvcmVhY3QtdGFicyc6ICdSYWRpeFRhYnMnLFxyXG4gICAgICAgICAgICBjbHN4OiAnY2xzeCcsXHJcbiAgICAgICAgICAgICdyZWFjdC13b3JsZC1mbGFncyc6ICdSZWFjdFdvcmxkRmxhZ3MnLFxyXG4gICAgICAgICAgfSxcclxuICAgICAgICB9LFxyXG4gICAgICB9LFxyXG4gICAgfSxcclxuICB9KSxcclxufSkpO1xyXG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQTZTLE9BQU8sV0FBVztBQUMvVCxTQUFTLGVBQWU7QUFDeEIsU0FBUyxvQkFBb0I7QUFDN0IsT0FBTyxTQUFTO0FBSGhCLElBQU0sbUNBQW1DO0FBS3pDLElBQU8sc0JBQVEsYUFBYSxDQUFDLEVBQUUsS0FBSyxPQUFPO0FBQUEsRUFDekMsU0FBUztBQUFBLElBQ1AsTUFBTTtBQUFBLElBQ04sSUFBSTtBQUFBLE1BQ0Ysa0JBQWtCO0FBQUEsSUFDcEIsQ0FBQztBQUFBLEVBQ0g7QUFBQTtBQUFBLEVBR0EsUUFBUTtBQUFBLElBQ04sTUFBTTtBQUFBLElBQ04sTUFBTTtBQUFBLEVBQ1I7QUFBQTtBQUFBLEVBR0EsR0FBSSxTQUFTLGdCQUFnQjtBQUFBLElBQzNCLE9BQU87QUFBQSxNQUNMLEtBQUs7QUFBQSxRQUNILE9BQU8sUUFBUSxrQ0FBVyxjQUFjO0FBQUEsUUFDeEMsTUFBTTtBQUFBLFFBQ04sU0FBUyxDQUFDLE1BQU0sS0FBSztBQUFBLFFBQ3JCLFVBQVUsWUFBVSw4QkFBOEIsTUFBTTtBQUFBLE1BQzFEO0FBQUEsTUFDQSxlQUFlO0FBQUEsUUFDYixVQUFVO0FBQUEsVUFDUjtBQUFBLFVBQ0E7QUFBQSxVQUNBO0FBQUEsVUFDQTtBQUFBLFVBQ0E7QUFBQSxVQUNBO0FBQUEsVUFDQTtBQUFBLFVBQ0E7QUFBQSxVQUNBO0FBQUEsVUFDQTtBQUFBLFVBQ0E7QUFBQSxVQUNBO0FBQUEsVUFDQTtBQUFBLFFBQ0Y7QUFBQSxRQUNBLFFBQVE7QUFBQSxVQUNOLFNBQVM7QUFBQSxZQUNQLE9BQU87QUFBQSxZQUNQLGFBQWE7QUFBQSxZQUNiLHFCQUFxQjtBQUFBLFlBQ3JCLDJCQUEyQjtBQUFBLFlBQzNCLGlDQUFpQztBQUFBLFlBQ2pDLDBCQUEwQjtBQUFBLFlBQzFCLDBCQUEwQjtBQUFBLFlBQzFCLDRCQUE0QjtBQUFBLFlBQzVCLCtCQUErQjtBQUFBLFlBQy9CLDBCQUEwQjtBQUFBLFlBQzFCLHdCQUF3QjtBQUFBLFlBQ3hCLE1BQU07QUFBQSxZQUNOLHFCQUFxQjtBQUFBLFVBQ3ZCO0FBQUEsUUFDRjtBQUFBLE1BQ0Y7QUFBQSxJQUNGO0FBQUEsRUFDRjtBQUNGLEVBQUU7IiwKICAibmFtZXMiOiBbXQp9Cg==
