import webpush from "web-push"

const subject = process.env.VAPID_SUBJECT
const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
const privateKey = process.env.VAPID_PRIVATE_KEY

if (!subject || !publicKey || !privateKey) {
  throw new Error(
    `Missing VAPID env vars: ${[
      !subject && "VAPID_SUBJECT",
      !publicKey && "NEXT_PUBLIC_VAPID_PUBLIC_KEY",
      !privateKey && "VAPID_PRIVATE_KEY",
    ].filter(Boolean).join(", ")}`
  )
}

webpush.setVapidDetails(subject, publicKey, privateKey)

export { webpush }
