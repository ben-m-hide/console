import { Duration, RemovalPolicy, Stack, type StackProps } from "aws-cdk-lib";
import {
	Distribution,
	HeadersFrameOption,
	HeadersReferrerPolicy,
	ResponseHeadersPolicy,
	ViewerProtocolPolicy,
} from "aws-cdk-lib/aws-cloudfront";
import { S3BucketOrigin } from "aws-cdk-lib/aws-cloudfront-origins";
import { BlockPublicAccess, Bucket } from "aws-cdk-lib/aws-s3";
import { type Construct } from "constructs";

export class HostingStack extends Stack {
	constructor(scope: Construct, id: string, props?: StackProps) {
		super(scope, id, props);

		// Build artifact only, trivially reproducible — safe to destroy with the stack.
		const siteBucket = new Bucket(this, "SiteBucket", {
			blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
			enforceSSL: true,
			removalPolicy: RemovalPolicy.DESTROY,
			autoDeleteObjects: true,
		});

		// unsafe-inline on style-src: Mantine injects runtime <style> tags for
		// breakpoints, verified empirically (docs/adr/0007). A strict policy
		// needs a per-request nonce, deferred until worth the edge-compute cost.
		//
		// connect-src 'self' is explicit, not redundant with default-src: a
		// deliberate fail-safe placeholder until the API's real origin exists
		// (docs/adr/0008) — update once the Lambda-vs-Fargate/domain decision lands.
		const securityHeaders = new ResponseHeadersPolicy(
			this,
			"SecurityHeadersPolicy",
			{
				securityHeadersBehavior: {
					contentSecurityPolicy: {
						contentSecurityPolicy:
							"default-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'",
						override: true,
					},
					frameOptions: {
						frameOption: HeadersFrameOption.DENY,
						override: true,
					},
					referrerPolicy: {
						referrerPolicy:
							HeadersReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN,
						override: true,
					},
					strictTransportSecurity: {
						accessControlMaxAge: Duration.days(730),
						includeSubdomains: true,
						preload: true,
						override: true,
					},
					contentTypeOptions: { override: true },
				},
			},
		);

		new Distribution(this, "Distribution", {
			defaultRootObject: "index.html",
			defaultBehavior: {
				origin: S3BucketOrigin.withOriginAccessControl(siteBucket),
				viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
				responseHeadersPolicy: securityHeaders,
			},
			// SPA fallback: an S3 403 or genuine 404 serves index.html instead.
			errorResponses: [
				{
					httpStatus: 403,
					responseHttpStatus: 200,
					responsePagePath: "/index.html",
				},
				{
					httpStatus: 404,
					responseHttpStatus: 200,
					responsePagePath: "/index.html",
				},
			],
		});
	}
}
