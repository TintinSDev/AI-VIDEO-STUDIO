router.get("/", async (_, res) => {
  const templates = await prisma.template.findMany();
  res.json(templates);
});
