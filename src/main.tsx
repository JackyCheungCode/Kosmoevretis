import React from "react";
import ReactDOM from "react-dom/client";
import "./styles/carbon.scss";
import "./styles/design-tokens.scss";
import "./styles/global.scss";
import { App } from "./app/App";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
