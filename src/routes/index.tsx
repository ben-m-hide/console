import { createFileRoute } from "@tanstack/react-router";
import type { ReactElement } from "react";

import { Button } from "@/components/ui/button";

const IndexComponent = (): ReactElement => (
	<div className="p-8">
		<h1 className="font-semibold text-2xl">console-next</h1>
		<Button className="mt-4">It works</Button>
	</div>
);

export const Route = createFileRoute("/")({
	component: IndexComponent,
});
