#!/usr/bin/env -S tsx
import { render } from "ink";
import { App } from "./App.js";
import { resolveConfig } from "./config.js";

const config = resolveConfig();

render(<App config={config} />);
