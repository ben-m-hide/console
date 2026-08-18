import {
	TanStackDevtools,
	type TanStackDevtoolsReactPlugin,
} from "@tanstack/react-devtools";
import { FormDevtoolsPanel } from "@tanstack/react-form-devtools";
import { ReactQueryDevtoolsPanel } from "@tanstack/react-query-devtools";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import type { FC } from "react";

const plugins: Array<TanStackDevtoolsReactPlugin> = [
	{ name: "TanStack Query", render: <ReactQueryDevtoolsPanel /> },
	{ name: "TanStack Router", render: <TanStackRouterDevtoolsPanel /> },
	{ name: "TanStack Form", render: <FormDevtoolsPanel /> },
];

export const Devtools: FC = () => {
	return <TanStackDevtools plugins={plugins} />;
};
