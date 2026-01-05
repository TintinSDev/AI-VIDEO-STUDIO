import Stripe from "stripe";
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
export async function createCheckout(userId, priceId) {
  return stripe.checkout.sessions.create({
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${process.env.APP_URL}/dashboard`,
    cancel_url: `${process.env.APP_URL}/billing`,
    metadata: { userId }
  });
}
app.post("/webhook/stripe", bodyParser.raw({type: "application/json"}), (req,res)=>{
  const event = stripe.webhooks.constructEvent(
    req.body,
    req.headers["stripe-signature"],
    process.env.STRIPE_WEBHOOK_SECRET
  );

  if (event.type === "checkout.session.completed") {
    const userId = event.data.object.metadata.userId;
    // upgrade user plan
  }

  res.json({received:true});
});
if (user.minutesUsed + videoDuration > user.plan.minutes) {
  throw new Error("Plan limit exceeded");
}
export function logUsage(userId, usage) {
  db.usage.update({
    where: { userId },
    data: {
      minutesUsed: { increment: usage.minutes },
      renders: { increment: 1 }
    }
  });
}
