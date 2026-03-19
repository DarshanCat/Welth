"use server";

import { db } from "@/lib/prisma";
import { checkUser } from "@/lib/checkUser";
import { revalidatePath } from "next/cache";

export async function getNotifications() {
  const user = await checkUser();
  if (!user) return { success: false, error: "Unauthorized" };

  try {
    const notifications = await db.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });
    return { success: true, data: notifications };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function markNotificationAsRead(notificationId) {
  const user = await checkUser();
  if (!user) return { success: false, error: "Unauthorized" };

  try {
    await db.notification.update({
      where: { id: notificationId, userId: user.id },
      data: { isRead: true },
    });
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function markAllNotificationsAsRead() {
  const user = await checkUser();
  if (!user) return { success: false, error: "Unauthorized" };

  try {
    await db.notification.updateMany({
      where: { userId: user.id, isRead: false },
      data: { isRead: true },
    });
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
