import type { PostData, PostFormat, TemplateId } from "@/lib/admin/instagram";
import TemplateA from "./TemplateA";
import TemplateB from "./TemplateB";
import TemplateC from "./TemplateC";
import TemplateD from "./TemplateD";
import TemplateE from "./TemplateE";
import TemplateF from "./TemplateF";

export type TemplateComponent = (props: {
  data: PostData;
  format: PostFormat;
}) => React.ReactElement;

export const TEMPLATES: Record<
  TemplateId,
  { label: string; Component: TemplateComponent }
> = {
  A: { label: "Gradient band", Component: TemplateA },
  B: { label: "Floating card", Component: TemplateB },
  C: { label: "Framed + footer", Component: TemplateC },
  D: { label: "Top band", Component: TemplateD },
  E: { label: "Split", Component: TemplateE },
  F: { label: "Yellow badge", Component: TemplateF },
};
