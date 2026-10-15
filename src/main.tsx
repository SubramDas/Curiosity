import { ClassificationProvider } from "../shared/features/classification/ClassificationProvider";
import { createRoot } from "react-dom/client";
import App from "./App";
import "../desktop-ui/styles.css";
import "../mobile-ui/styles.css";
createRoot(document.getElementById("root")!).render(
  <ClassificationProvider>
    <App />
  </ClassificationProvider>,
);
