import type { StackProps } from "aws-cdk-lib";
import { Duration, RemovalPolicy, Stack } from "aws-cdk-lib";
import {
	Distribution,
	HeadersFrameOption,
	HeadersReferrerPolicy,
	ResponseHeadersPolicy,
	ViewerProtocolPolicy,
} from "aws-cdk-lib/aws-cloudfront";
import { S3BucketOrigin } from "aws-cdk-lib/aws-cloudfront-origins";
import { BlockPublicAccess, Bucket } from "aws-cdk-lib/aws-s3";
import type { Construct } from "constructs";

export class HostingStack extends Stack {
	constructor(scope: Construct, id: string, props?: StackProps) {
		super(scope, id, props);

		// Build artifact only (`dist/`), trivially reproducible from source —
		// safe to destroy alongside the stack, unlike a data-holding bucket.
		const siteBucket = new Bucket(this, "SiteBucket", {
			blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
			enforceSSL: true,
			removalPolicy: RemovalPolicy.DESTROY,
			autoDeleteObjects: true,
		});

		// `unsafe-inline` on style-src is required because Mantine injects
		// runtime <style data-mantine-styles> tags for responsive breakpoints
		// (verified empirically — see docs/adr/0007-aws-s3-cloudfront-hosting.md).
		// A strict policy needs a per-request nonce via a CloudFront Function,
		// deferred until this is worth the extra edge-compute complexity.
		const securityHeaders = new ResponseHeadersPolicy(
			this,
			"SecurityHeadersPolicy",
			{
				securityHeadersBehavior: {
					contentSecurityPolicy: {
						contentSecurityPolicy:
							"default-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'",
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
			// SPA fallback: any unknown path (S3 403 for a private bucket, or a
			// genuine 404) serves index.html so client-side routing can take over.
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
