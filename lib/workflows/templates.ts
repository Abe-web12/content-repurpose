import { prisma } from "@/lib/prisma";

interface TemplateDefinition {
  name: string;
  description: string;
  category: string;
  nodes: unknown[];
  edges: unknown[];
  variables?: Record<string, string>;
  icon?: string;
}

const BUILT_IN_TEMPLATES: TemplateDefinition[] = [
  {
    name: "Blog Writer",
    description: "Generate SEO-optimized blog posts from topics",
    category: "content",
    icon: "file-text",
    nodes: [
      { id: "trigger", type: "TRIGGER", label: "Manual Trigger", config: {}, positionX: 50, positionY: 200 },
      { id: "generate", type: "AI_GENERATE", label: "Generate Blog Post", config: { format: "blog", prompt: "Write a blog post about {{topic}}", temperature: 0.7 }, positionX: 350, positionY: 200 },
      { id: "optimize", type: "AI_OPTIMIZE", label: "SEO Optimize", config: { keywords: ["{{keyword}}"] }, positionX: 650, positionY: 200 },
      { id: "output", type: "FORMATTER", label: "Format Output", config: { format: "markdown" }, positionX: 950, positionY: 200 },
    ],
    edges: [
      { id: "e1", sourceNodeId: "trigger", targetNodeId: "generate" },
      { id: "e2", sourceNodeId: "generate", targetNodeId: "optimize" },
      { id: "e3", sourceNodeId: "optimize", targetNodeId: "output" },
    ],
    variables: { topic: "your blog topic", keyword: "primary keyword" },
  },
  {
    name: "SEO Generator",
    description: "Generate SEO metadata and content",
    category: "marketing",
    icon: "search",
    nodes: [
      { id: "trigger", type: "TRIGGER", label: "Manual Trigger", config: {}, positionX: 50, positionY: 200 },
      { id: "generate", type: "AI_GENERATE", label: "Generate SEO Content", config: { format: "seo", prompt: "Generate SEO content for {{topic}}" }, positionX: 350, positionY: 200 },
      { id: "rewrite", type: "AI_REWRITE", label: "Polish", config: { tone: "professional" }, positionX: 650, positionY: 200 },
    ],
    edges: [
      { id: "e1", sourceNodeId: "trigger", targetNodeId: "generate" },
      { id: "e2", sourceNodeId: "generate", targetNodeId: "rewrite" },
    ],
    variables: { topic: "your topic" },
  },
  {
    name: "Email Campaign",
    description: "Create email sequences for campaigns",
    category: "marketing",
    icon: "mail",
    nodes: [
      { id: "trigger", type: "TRIGGER", label: "Manual Trigger", config: {}, positionX: 50, positionY: 200 },
      { id: "generate", type: "AI_GENERATE", label: "Write Email", config: { format: "email", prompt: "Write an email about {{subject}}" }, positionX: 350, positionY: 200 },
      { id: "rewrite", type: "AI_REWRITE", label: "Polish Tone", config: { tone: "professional" }, positionX: 650, positionY: 200 },
      { id: "email", type: "EMAIL", label: "Send Email", config: { to: "{{recipient}}", subject: "{{subject}}" }, positionX: 950, positionY: 200 },
    ],
    edges: [
      { id: "e1", sourceNodeId: "trigger", targetNodeId: "generate" },
      { id: "e2", sourceNodeId: "generate", targetNodeId: "rewrite" },
      { id: "e3", sourceNodeId: "rewrite", targetNodeId: "email" },
    ],
    variables: { subject: "email subject", recipient: "recipient@example.com" },
  },
  {
    name: "Twitter Thread",
    description: "Generate Twitter/X threads from content",
    category: "social",
    icon: "message-circle",
    nodes: [
      { id: "trigger", type: "TRIGGER", label: "Manual Trigger", config: {}, positionX: 50, positionY: 200 },
      { id: "generate", type: "AI_GENERATE", label: "Create Thread", config: { format: "twitter_thread", prompt: "Create a Twitter thread about {{topic}}" }, positionX: 350, positionY: 200 },
      { id: "shorten", type: "AI_SHORTEN", label: "Shorten Tweets", config: { targetLength: "short" }, positionX: 650, positionY: 200 },
    ],
    edges: [
      { id: "e1", sourceNodeId: "trigger", targetNodeId: "generate" },
      { id: "e2", sourceNodeId: "generate", targetNodeId: "shorten" },
    ],
    variables: { topic: "thread topic" },
  },
  {
    name: "LinkedIn Post",
    description: "Generate professional LinkedIn posts",
    category: "social",
    icon: "linkedin",
    nodes: [
      { id: "trigger", type: "TRIGGER", label: "Manual Trigger", config: {}, positionX: 50, positionY: 200 },
      { id: "generate", type: "AI_GENERATE", label: "Write Post", config: { format: "linkedin_post", prompt: "Write a LinkedIn post about {{topic}}" }, positionX: 350, positionY: 200 },
    ],
    edges: [{ id: "e1", sourceNodeId: "trigger", targetNodeId: "generate" }],
    variables: { topic: "post topic" },
  },
  {
    name: "Meeting Summary",
    description: "Summarize meeting transcripts",
    category: "productivity",
    icon: "clipboard",
    nodes: [
      { id: "trigger", type: "TRIGGER", label: "Manual Trigger", config: {}, positionX: 50, positionY: 200 },
      { id: "summarize", type: "AI_SUMMARIZE", label: "Summarize", config: { length: "medium" }, positionX: 350, positionY: 200 },
    ],
    edges: [{ id: "e1", sourceNodeId: "trigger", targetNodeId: "summarize" }],
    variables: {},
  },
  {
    name: "Translation",
    description: "Translate content to multiple languages",
    category: "content",
    icon: "globe",
    nodes: [
      { id: "trigger", type: "TRIGGER", label: "Manual Trigger", config: {}, positionX: 50, positionY: 200 },
      { id: "translate", type: "AI_TRANSLATE", label: "Translate", config: { targetLanguage: "{{language}}" }, positionX: 350, positionY: 200 },
    ],
    edges: [{ id: "e1", sourceNodeId: "trigger", targetNodeId: "translate" }],
    variables: { language: "es" },
  },
  {
    name: "Code Review",
    description: "Review code with AI analysis",
    category: "developer",
    icon: "code",
    nodes: [
      { id: "trigger", type: "TRIGGER", label: "Manual Trigger", config: {}, positionX: 50, positionY: 200 },
      { id: "review", type: "AI_GENERATE", label: "Review Code", config: { format: "code_review", prompt: "Review this code:\n\n{{code}}" }, positionX: 350, positionY: 200 },
    ],
    edges: [{ id: "e1", sourceNodeId: "trigger", targetNodeId: "review" }],
    variables: { code: "paste your code here" },
  },
  {
    name: "Marketing Funnel",
    description: "Generate content for each funnel stage",
    category: "marketing",
    icon: "trending-up",
    nodes: [
      { id: "trigger", type: "TRIGGER", label: "Manual Trigger", config: {}, positionX: 50, positionY: 300 },
      { id: "top", type: "AI_GENERATE", label: "Top of Funnel", config: { format: "social", prompt: "Create awareness content for {{topic}}" }, positionX: 350, positionY: 100 },
      { id: "middle", type: "AI_GENERATE", label: "Middle of Funnel", config: { format: "blog", prompt: "Create consideration content for {{topic}}" }, positionX: 350, positionY: 300 },
      { id: "bottom", type: "AI_GENERATE", label: "Bottom of Funnel", config: { format: "email", prompt: "Create conversion content for {{topic}}" }, positionX: 350, positionY: 500 },
      { id: "merge", type: "MERGE", label: "Collect Results", config: {}, positionX: 700, positionY: 300 },
    ],
    edges: [
      { id: "e1", sourceNodeId: "trigger", targetNodeId: "top" },
      { id: "e2", sourceNodeId: "trigger", targetNodeId: "middle" },
      { id: "e3", sourceNodeId: "trigger", targetNodeId: "bottom" },
      { id: "e4", sourceNodeId: "top", targetNodeId: "merge" },
      { id: "e5", sourceNodeId: "middle", targetNodeId: "merge" },
      { id: "e6", sourceNodeId: "bottom", targetNodeId: "merge" },
    ],
    variables: { topic: "your topic" },
  },
  {
    name: "Sales Outreach",
    description: "Generate personalized sales emails",
    category: "sales",
    icon: "briefcase",
    nodes: [
      { id: "trigger", type: "TRIGGER", label: "Manual Trigger", config: {}, positionX: 50, positionY: 200 },
      { id: "generate", type: "AI_GENERATE", label: "Write Outreach", config: { format: "email", prompt: "Write a sales outreach email about {{product}} to {{prospect}}" }, positionX: 350, positionY: 200 },
      { id: "condition", type: "CONDITION", label: "Has Follow-up?", config: { field: "needsFollowUp", operator: "equals", value: true }, positionX: 650, positionY: 200 },
      { id: "followup", type: "AI_GENERATE", label: "Write Follow-up", config: { format: "email", prompt: "Write a follow-up email" }, positionX: 650, positionY: 400 },
    ],
    edges: [
      { id: "e1", sourceNodeId: "trigger", targetNodeId: "generate" },
      { id: "e2", sourceNodeId: "generate", targetNodeId: "condition" },
      { id: "e3", sourceNodeId: "condition", targetNodeId: "followup", sourceHandle: "true" },
    ],
    variables: { product: "your product", prospect: "prospect name" },
  },
  {
    name: "Customer Support",
    description: "Generate support responses",
    category: "support",
    icon: "headphones",
    nodes: [
      { id: "trigger", type: "TRIGGER", label: "Manual Trigger", config: {}, positionX: 50, positionY: 200 },
      { id: "categorize", type: "AI_GENERATE", label: "Categorize Issue", config: { format: "classification", prompt: "Categorize this support issue:\n\n{{issue}}" }, positionX: 350, positionY: 200 },
      { id: "respond", type: "AI_GENERATE", label: "Generate Response", config: { format: "email", prompt: "Write a support response for {{issue}}" }, positionX: 650, positionY: 200 },
    ],
    edges: [
      { id: "e1", sourceNodeId: "trigger", targetNodeId: "categorize" },
      { id: "e2", sourceNodeId: "categorize", targetNodeId: "respond" },
    ],
    variables: { issue: "describe the issue" },
  },
];

export class WorkflowTemplates {
  static async seedBuiltIn() {
    for (const template of BUILT_IN_TEMPLATES) {
      const existing = await prisma.workflowTemplates.findFirst({
        where: { name: template.name, isBuiltIn: true },
      });
      if (!existing) {
        await prisma.workflowTemplates.create({
          data: {
            name: template.name,
            description: template.description,
            category: template.category,
            icon: template.icon,
            nodes: template.nodes as any,
            edges: template.edges as any,
            variables: template.variables as any,
            isBuiltIn: true,
          },
        });
      }
    }
  }

  static async list(options?: { category?: string; search?: string; limit?: number; cursor?: string }) {
    const where: Record<string, unknown> = {};
    if (options?.category) where.category = options.category;
    if (options?.search) where.name = { contains: options.search, mode: "insensitive" };

    const limit = Math.min(options?.limit ?? 50, 100);
    const templates = await prisma.workflowTemplates.findMany({
      where,
      take: limit + 1,
      ...(options?.cursor ? { cursor: { id: options.cursor }, skip: 1 } : {}),
      orderBy: [{ isBuiltIn: "desc" }, { usageCount: "desc" }],
    });

    const hasMore = templates.length > limit;
    const data = hasMore ? templates.slice(0, limit) : templates;
    return { data, nextCursor: hasMore ? data[data.length - 1].id : null, hasMore };
  }

  static async getById(templateId: string) {
    const template = await prisma.workflowTemplates.findUnique({ where: { id: templateId } });
    if (!template) throw new Error("Template not found");
    return template;
  }

  static async createFromWorkflow(workflowId: string, options: { name: string; description?: string; category?: string; organizationId: string; userId: string }) {
    const { nodes, edges } = await this.extractWorkflowData(workflowId);
    const template = await prisma.workflowTemplates.create({
      data: {
        name: options.name,
        description: options.description,
        category: options.category ?? "custom",
        nodes: nodes as any,
        edges: edges as any,
        organizationId: options.organizationId,
        createdById: options.userId,
        isBuiltIn: false,
      },
    });
    return template;
  }

  static async applyTemplate(templateId: string, organizationId: string, userId: string) {
    const template = await this.getById(templateId);
    const nodes = template.nodes as any[];
    const edges = template.edges as any[];

    const workflow = await prisma.workflows.create({
      data: {
        name: `${template.name} (from template)`,
        description: template.description,
        organizationId,
        createdById: userId,
        updatedById: userId,
      },
    });

    const nodeIdMap = new Map<string, string>();
    for (const node of nodes) {
      const newId = crypto.randomUUID();
      nodeIdMap.set(node.id, newId);
      await prisma.workflowNodes.create({
        data: {
          id: newId,
          workflowId: workflow.id,
          type: node.type as any,
          label: node.label,
          config: node.config ?? {},
          positionX: node.positionX,
          positionY: node.positionY,
          width: node.width ?? 200,
          height: node.height ?? 100,
        },
      });
    }

    for (const edge of edges) {
      await prisma.workflowEdges.create({
        data: {
          workflowId: workflow.id,
          sourceNodeId: nodeIdMap.get(edge.sourceNodeId) ?? edge.sourceNodeId,
          targetNodeId: nodeIdMap.get(edge.targetNodeId) ?? edge.targetNodeId,
          sourceHandle: edge.sourceHandle,
          targetHandle: edge.targetHandle,
          label: edge.label,
        },
      });
    }

    if (template.variables) {
      const vars = template.variables as Record<string, string>;
      for (const [name, value] of Object.entries(vars)) {
        await prisma.workflowVariables.create({
          data: { workflowId: workflow.id, name, value, isSecret: false },
        });
      }
    }

    await prisma.workflowTemplates.update({
      where: { id: templateId },
      data: { usageCount: { increment: 1 } },
    });

    return workflow;
  }

  static async incrementUsage(templateId: string) {
    return prisma.workflowTemplates.update({
      where: { id: templateId },
      data: { usageCount: { increment: 1 } },
    });
  }

  private static async extractWorkflowData(workflowId: string) {
    const [nodes, edges] = await Promise.all([
      prisma.workflowNodes.findMany({ where: { workflowId, deletedAt: null } }),
      prisma.workflowEdges.findMany({ where: { workflowId, deletedAt: null } }),
    ]);
    return { nodes, edges };
  }
}
