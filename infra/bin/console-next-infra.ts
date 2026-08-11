import { App } from "aws-cdk-lib";

import { HostingStack } from "../lib/hosting-stack";

const app = new App();

new HostingStack(app, "ConsoleNextHosting");
