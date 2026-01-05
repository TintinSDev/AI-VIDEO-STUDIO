router.get("/renders", requireAdmin, async (_, res) => {
  const renders = await prisma.render.findMany({
    orderBy: { createdAt: "desc" }
  });

  res.json(renders);
});
