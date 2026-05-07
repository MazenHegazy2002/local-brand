import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const { message, productId, orderId, history } = await req.json();

    const session = await getServerSession(authOptions);
    const userId = (session?.user as { id: string })?.id;

    // Get or create conversation
    let conversation;
    if (userId) {
      conversation = await prisma.conversation.findFirst({
        where: { userId },
        orderBy: { updatedAt: 'desc' },
      });
      
      if (!conversation) {
        conversation = await prisma.conversation.create({
          data: { userId }
        });
      }
    }

    // Store user message
    if (conversation && userId) {
      await prisma.message.create({
        data: {
          conversationId: conversation.id,
          senderId: userId,
          role: 'USER',
          content: message,
        }
      });
    }

    const isOrderRelated = orderId || message.toLowerCase().includes('order');
    const isProductRelated = productId || message.toLowerCase().includes('product') || message.toLowerCase().includes('price');
    const isRefund = message.toLowerCase().includes('refund') || message.toLowerCase().includes('return');
    const isShipping = message.toLowerCase().includes('shipping') || message.toLowerCase().includes('delivery') || message.toLowerCase().includes('deliver');
    const isHello = message.toLowerCase().match(/^(hi|hello|hey|help)$/);

    let response = '';

    if (isHello) {
      response = "Hello! I'm here to help. You can ask about:\n• Order status & tracking\n• Product details & pricing\n• Returns & refunds\n• Shipping info\n• Anything else about your purchase";
    } else if (isOrderRelated) {
      if (orderId) {
        const order = await prisma.order.findUnique({
          where: { id: orderId },
          include: { 
            items: { 
              include: { 
                variant: { include: { product: { include: { images: true } } } } 
              } 
            } 
          },
        });
        if (order) {
          response = `📦 Your order #${orderId.slice(0, 8)} is currently **${order.status}**.\n\n`;
          response += order.items.map(item => `• ${item.variant.product.title} x${item.quantity}`).join('\n');
          if (order.status === 'SHIPPED' || order.status === 'DELIVERED') {
            response += '\n\nYou can track your order delivery in real-time!';
          }
        }
      } else {
        const orders = userId ? await prisma.order.findMany({
          where: { userId, status: { not: 'CANCELLED' } },
          orderBy: { createdAt: 'desc' },
          take: 5,
        }) : [];
        if (orders.length > 0) {
          response = `📦 You have ${orders.length} order(s):\n\n`;
          response += orders.map(o => `• #${o.id.slice(0, 8)} - ${o.status} (${o.totalAmount} EGP)`).join('\n');
          response += '\n\nProvide an order ID for more details.';
        } else {
          response = "You don't have any active orders. Would you like to browse our shop?";
        }
      }
    } else if (isProductRelated) {
      if (productId) {
        const product = await prisma.product.findUnique({
          where: { id: productId },
          include: { images: true, seller: true },
        });
        if (product) {
          response = `🛍️ **${product.title}**\n\n`;
          response += `💰 Price: ${product.basePrice} EGP\n`;
          if (product.seller) response += `🏪 Seller: ${product.seller.storeName}\n`;
          if (product.description) response += `\n${product.description.slice(0, 200)}...`;
        }
      } else {
        response = "I'd be happy to help you find a product! What are you looking for? You can browse our shop at /shop";
      }
    } else if (isShipping) {
      response = "🚚 For shipping inquiries:\n\n";
      response += "• Standard delivery: 3-7 business days\n";
      response += "• Express delivery: 1-2 business days\n";
      response += "• Free shipping on orders over 500 EGP\n\n";
      response += "Would you like to calculate shipping for a specific product?";
    } else if (isRefund) {
      response = "↩️ Return & Refund Policy:\n\n";
      response += "• 14-day return window\n";
      response += "• Items must be unused with tags\n";
      response += "• Refund to original payment method\n\n";
      response += "Start a return at /help or provide your order ID";
    } else if (message.toLowerCase().includes('contact') || message.toLowerCase().includes('support')) {
      response = "📞 Contact Support:\n\n";
      response += "• Email: support@localbrand.com\n";
      response += "• Phone: +20 123 456 7890\n";
      response += "• Hours: Sun-Thu, 9AM-6PM EGT";
    } else if (message.length < 3) {
      response = "Please tell us more about how we can help.";
    } else {
      const keywords = ['thank', 'thanks', 'ok', 'okay', 'great', 'nice'];
      if (keywords.some(k => message.toLowerCase().includes(k))) {
        response = "You're welcome! Is there anything else I can help with?";
      } else {
        response = "I understand you're looking for help with \"" + message.slice(0, 50) + "...\"\n\n";
        response += "For immediate assistance, you can:\n";
        response += "• Browse our help center: /help\n";
        response += "• Start a return: /help\n";
        response += "• Contact support directly\n\n";
        response += "Or describe your issue in more detail.";
      }
    }

    // Store assistant response
    if (conversation && userId) {
      await prisma.message.create({
        data: {
          conversationId: conversation.id,
          senderId: 'ASSISTANT',
          role: 'ASSISTANT',
          content: response,
        }
      });

      // Update conversation timestamp
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: { updatedAt: new Date() }
      });
    }

    return NextResponse.json({ response }, { status: 200 });
  } catch (error) {
    console.error('Chat API Error:', error);
    return NextResponse.json({ response: "I apologize, but I'm having trouble processing your request. Please try again or contact support." }, { status: 500 });
  }
}