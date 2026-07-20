import { createFileRoute } from "@tanstack/react-router";
import { ContentAdmin } from "../courses/index";

export const Route = createFileRoute("/_authenticated/admin/products/")({
  component: () => <ContentAdmin table="digital_products" title="Digital Products" />,
});
