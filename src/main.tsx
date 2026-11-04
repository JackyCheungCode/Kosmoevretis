import React from "react";
import ReactDOM from "react-dom/client";
import "./styles/carbon.scss";
import "./styles/design-tokens.scss";
import "./styles/global.scss";
import "./styles/page-layout.scss";
import "./styles/component-primitives.scss";
import "./styles/intelligence-pages.scss";
import "./styles/settings-pages.scss";
import { App } from "./app/App";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
