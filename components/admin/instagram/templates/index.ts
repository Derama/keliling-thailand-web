import type { PostData, PostFormat, TemplateId } from "@/lib/admin/instagram";
import TemplateA from "./TemplateA";
import TemplateB from "./TemplateB";
import TemplateC from "./TemplateC";
import TemplateD from "./TemplateD";
import TemplateE from "./TemplateE";
import TemplateF from "./TemplateF";
import TemplateG from "./TemplateG";
import TemplateH from "./TemplateH";
import TemplateI from "./TemplateI";

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
  G: { label: "Polaroid", Component: TemplateG },
  H: { label: "Quote besar", Component: TemplateH },
  I: { label: "Panel samping", Component: TemplateI },
};
