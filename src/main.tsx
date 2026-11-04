import React from "react";
import ReactDOM from "react-dom/client";
import "@carbon/styles/css/styles.css";
import "./styles/global.scss";
import { App } from "./app/App";
ReactDOM.createRoot(document.getElementById("root")!).render(<React.StrictMode><App /></React.StrictMode>);