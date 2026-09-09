import React, { useState } from "react";
import {
  LumenResponseBlock,
  PropertySnippet,
  PaymentPromptData,
  LumenActionItem,
  LumenActionInput,
  ActivityStep,
  PropertyCompareData,
  CancellationPolicyData,
  PrivateChefExperienceData,
  WeatherForecastData,
  SupportFaqData,
} from "../../lib/types";
import { AggarlyChatBridgeClient } from "../../lib/chatBridgeClient";
import { PropertyDetailsShowcaseCard } from "./cards/PropertyDetailsShowcaseCard";
import { ToolResultCarousel } from "./ToolResultCarousel";
import { AvailabilityCalendarStripCard } from "./cards/AvailabilityCalendarStripCard";
import { BookingStatusTimelineCard } from "./cards/BookingStatusTimelineCard";
import { PaymentPromptCard } from "./cards/PaymentPromptCard";
import { ConfirmationCard } from "./ConfirmationCard";
import { MemoryConsentCard } from "./MemoryConsentCard";
import { HtmlEmbedBlockCard } from "./cards/HtmlEmbedBlockCard";
import { ScheduledTaskCard } from "./cards/ScheduledTaskCard";
import { VisionSearchResultsCard } from "./cards/VisionSearchResultsCard";
import { PropertyCompareCard } from "./cards/PropertyCompareCard";
import { CancellationPolicyCard } from "./cards/CancellationPolicyCard";
import { PrivateChefExperienceCard } from "./cards/PrivateChefExperienceCard";
import { WeatherForecastWidgetCard } from "./cards/WeatherForecastWidgetCard";
import { SupportFaqCard } from "./cards/SupportFaqCard";
import { MarkdownRenderer } from "./MarkdownRenderer";

interface LumenBlockRendererProps {
  blocks: LumenResponseBlock[];
  onQuickPrompt: (prompt: string) => void;
  onConfirmAction: (token: string) => Promise<void> | void;
  onConfirmMemory?: (data: any) => Promise<void> | void;
  onExecuteAction?: (action: string, parameters?: Record<string, any>, label?: string) => void;
  onOpenContext?: (preview: any) => void;
}

export const LumenBlockRenderer: React.FC<LumenBlockRendererProps> = ({
  blocks,
  onQuickPrompt,
  onConfirmAction,
  onConfirmMemory,
  onExecuteAction,
  onOpenContext,
}) => {
  const [activeInputModal, setActiveInputModal] = useState<{
    actionItem: LumenActionItem | any;
    values: Record<string, string>;
  } | null>(null);

  const handleActionClick = (actionItem: any) => {
    if (typeof actionItem === "string") {
      onQuickPrompt(actionItem);
      return;
    }

    const actionName = actionItem.action || actionItem.id || "";
    const params = actionItem.parameters || actionItem.params || actionItem.arguments || {};
    const label = actionItem.label || actionItem.title || actionName || "Execute Action";
    const inputs: LumenActionInput[] = actionItem.inputs || actionItem.inputFields || [];

    // If this action requires user input, open the interactive input card
    if (actionItem.requiresInput || inputs.length > 0) {
      const initialValues: Record<string, string> = {};
      inputs.forEach((inp) => {
        initialValues[inp.name] = inp.defaultValue !== undefined ? String(inp.defaultValue) : "";
      });
      setActiveInputModal({ actionItem, values: initialValues });
      return;
    }

    if (onExecuteAction && actionName) {
      onExecuteAction(actionName, params, label);
      return;
    }

    // Smart semantic prompt generator with all parameters embedded
    if (
      actionName === "booking.create" ||
      actionName === "create.booking" ||
      actionName === "property.book" ||
      actionName === "property.booking" ||
      actionName === "property.reserve" ||
      actionName === "booking.reserve" ||
      actionName === "proceed.to.book" ||
      actionName === "book.property"
    ) {
      const pId = params.propertyId || "";
      const cIn = params.checkIn || "";
      const cOut = params.checkOut || "";
      const guests = params.guests || 2;
      if (pId && cIn && cOut) {
        onQuickPrompt(`Please proceed with booking property ${pId} from ${cIn} to ${cOut} for ${guests} guests.`);
      } else if (pId) {
        onQuickPrompt(`Please book property ${pId}`);
      } else {
        onQuickPrompt(`Please proceed with booking this reservation.`);
      }
      return;
    }

    if (
      actionName === "auth.signin" ||
      actionName === "auth.login" ||
      actionName === "user.login" ||
      label.toLowerCase().includes("sign in") ||
      label.toLowerCase().includes("log in")
    ) {
      if (typeof window !== "undefined") {
        window.location.href = "/oauth2/callback";
      }
      return;
    }

    // Direct URL navigation / View Property page
    const targetUrl =
      actionItem.url ||
      actionItem.href ||
      params.url ||
      (actionName === "property.open_page" ||
      actionName === "property.view_page" ||
      actionName === "property.page" ||
      actionName === "navigate" ||
      actionName === "open_url"
        ? params.url || (params.propertyId ? `/properties/${params.propertyId}` : null)
        : null);

    if (targetUrl) {
      if (typeof window !== "undefined") {
        window.open(targetUrl, "_blank");
      }
      return;
    }

    if (actionName === "property.availability" || actionName === "availability.check") {
      const pId = params.propertyId || "";
      const cIn = params.checkIn || params.from || "";
      const cOut = params.checkOut || params.to || "";
      if (cIn && cOut) {
        onQuickPrompt(`Check availability for property ${pId} from ${cIn} to ${cOut}`);
      } else {
        onQuickPrompt(`Check availability calendar for property ${pId}`);
      }
      return;
    }

    if (actionName === "property.details" || actionName === "property.view") {
      const pId = params.propertyId || "";
      onQuickPrompt(`Show details for property ${pId}`);
      return;
    }

    if (actionName === "payment.create" || actionName === "payment.status") {
      const bId = params.bookingId || params.bookingRef || "";
      onQuickPrompt(`Review payment details for booking ${bId}`);
      return;
    }

    // Default fallback: formulate structured instruction with all parameters
    if (params && Object.keys(params).length > 0) {
      const paramStr = Object.entries(params)
        .map(([k, v]) => `${k}="${v}"`)
        .join(", ");
      onQuickPrompt(`Execute ${label} (${actionName}) with ${paramStr}`);
      return;
    }

    onQuickPrompt(label);
  };

  const handleInputModalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeInputModal) return;

    const { actionItem, values } = activeInputModal;
    const actionName = actionItem.action || actionItem.id || "";
    const params = actionItem.parameters || actionItem.params || actionItem.arguments || {};
    const label = actionItem.label || actionItem.title || "Action";

    const mergedParams = { ...params, ...values };

    if (onExecuteAction && actionName) {
      onExecuteAction(actionName, mergedParams, label);
      setActiveInputModal(null);
      return;
    }

    // Formulate targeted prompt depending on the action type
    if (actionName === "chat.message_host" || actionName === "message_host" || actionName === "message") {
      const pId = params.propertyId ? ` for property ${params.propertyId}` : "";
      const bId = params.bookingId ? ` for booking ${params.bookingId}` : "";
      onQuickPrompt(`Message to host${pId}${bId}: "${values.message || ""}"`);
    } else if (actionName === "notification.priceTracking" || actionName === "price.alert") {
      const pId = params.propertyId ? ` for property ${params.propertyId}` : "";
      onQuickPrompt(`Set price alert${pId} at €${values.targetPrice || ""}`);
    } else if (actionName === "review.create" || actionName === "submit_review") {
      const bId = params.bookingId ? ` for booking ${params.bookingId}` : "";
      onQuickPrompt(`Submit review${bId} (${values.rating || 5}/5 stars): "${values.comment || ""}"`);
    } else if (actionName === "support.ticketCreate" || actionName === "support.ticket") {
      onQuickPrompt(`Open support ticket regarding "${values.subject || ""}": ${values.description || ""}`);
    } else if (actionName === "coupon.create") {
      onQuickPrompt(`Create promotional coupon code "${values.code || ""}" with ${values.discountValue || 10}% discount`);
    } else {
      const inputStr = Object.entries(values)
        .filter(([_, v]) => v)
        .map(([k, v]) => `${k}="${v}"`)
        .join(", ");
      const paramStr = Object.entries(params)
        .map(([k, v]) => `${k}="${v}"`)
        .join(", ");
      const allArgs = [paramStr, inputStr].filter(Boolean).join(", ");
      onQuickPrompt(`Execute ${label} (${actionName}) with ${allArgs}`);
    }

    setActiveInputModal(null);
  };

  if (!blocks || blocks.length === 0) {
    return null;
  }

  return (
    <div className="lumen-blocks-container">
      {blocks.map((block, idx) => {
        switch (block.type) {
          case "text": {
            if (!block.content) return null;

            const lines = block.content.split("\n\n");
            const firstLine = lines[0]?.trim();
            const isOpeningQuote =
              firstLine &&
              firstLine.length > 5 &&
              firstLine.length < 200 &&
              ((firstLine.startsWith('"') && firstLine.endsWith('"')) ||
                (firstLine.startsWith('“') && firstLine.endsWith('”')) ||
                (firstLine.startsWith("'") && firstLine.endsWith("'")));

            if (isOpeningQuote) {
              const narrative = lines.slice(1).join("\n\n").trim();
              return (
                <div key={idx} className="lumen-text-block rounded-2xl rounded-tl-sm p-4 sm:p-5 bg-[#18181B] border border-[#2A2A2E] text-[#F5F4F1] shadow-[0_4px_12px_rgba(0,0,0,0.3)] my-1.5">
                  <div className="lumen-editorial-quote italic font-serif text-[#DCE6EF] mb-2">{firstLine}</div>
                  {narrative && (
                    <MarkdownRenderer
                      content={narrative}
                      className="lumen-narrative-text text-[#F5F4F1] font-sans text-[14px] leading-relaxed"
                    />
                  )}
                </div>
              );
            }

            return (
              <div key={idx} className="lumen-text-block rounded-2xl rounded-tl-sm p-4 sm:p-5 bg-[#18181B] border border-[#2A2A2E] text-[#F5F4F1] shadow-[0_4px_12px_rgba(0,0,0,0.3)] my-1.5">
                <MarkdownRenderer
                  content={block.content}
                  className="lumen-narrative-text text-[#F5F4F1] font-sans text-[14px] leading-relaxed"
                />
              </div>
            );
          }

          case "property":
          case "property_card": {
            const raw = block.data || {};
            if (onOpenContext && (raw.bortle || raw.badge || raw.price)) {
              return (
                <div key={idx} className="w-full max-w-[340px] my-2">
                  <article
                    onClick={() =>
                      onOpenContext({
                        type: "property",
                        title: raw.title || "Sanctuary Detail",
                        data: raw,
                      })
                    }
                    className="w-full rounded-2xl bg-[#0A0A0C] border border-[#2A2A2E] overflow-hidden flex flex-col group hover:border-[#9A9A9F]/60 transition-all duration-300 cursor-pointer shadow-lg"
                  >
                    <div className="relative h-44 w-full overflow-hidden bg-[#2A2A2D]">
                      {raw.imageUrl ? (
                        <img
                          src={raw.imageUrl}
                          alt={raw.title}
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[#9A9A9F] font-mono text-xs">
                          Sanctuary Basalt Architecture
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0C] via-transparent to-transparent" />
                      <div className="absolute top-3 left-3 px-2 py-0.5 rounded-full bg-[#0A0A0C]/80 backdrop-blur-sm border border-[#2A2A2E] font-mono text-[10px] text-[#F5F4F1]">
                        {raw.badge || "14″ CELESTIAL OPTICS"}
                      </div>
                    </div>
                    <div className="p-4 flex flex-col flex-grow justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-[11px] uppercase tracking-widest text-[#9A9A9F] truncate max-w-[180px]">
                            {raw.location || raw.city || "Curated Destination"}
                          </span>
                          <span className="font-mono text-[11px] text-[#8FAE97] shrink-0">
                            {raw.bortle || "Bortle Class 1"}
                          </span>
                        </div>
                        <h2 className="font-serif text-base text-[#F5F4F1] leading-tight line-clamp-1">
                          {raw.title}
                        </h2>
                        <p className="font-serif italic text-xs text-[#9A9A9F] line-clamp-2">
                          {raw.description || raw.subtitle || "Rooftop motorized dome with celestial optics, zero light bleed."}
                        </p>
                      </div>
                      <div className="pt-2 border-t border-[#2A2A2E] flex items-center justify-between">
                        <div>
                          <span className="font-serif text-base text-[#F5F4F1]">
                            {raw.price ? (typeof raw.price === "number" ? `$${raw.price}` : raw.price) : "$680"}
                          </span>
                          <span className="font-mono text-[11px] text-[#9A9A9F]"> / night</span>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenContext({
                              type: "property",
                              title: raw.title,
                              data: raw,
                            });
                          }}
                          className="px-3.5 py-1.5 rounded-full border border-[#2A2A2E] hover:border-[#F5F4F1] bg-[#18181B] text-[#F5F4F1] font-mono text-[10px] uppercase tracking-widest transition-colors cursor-pointer"
                        >
                          View Itinerary
                        </button>
                      </div>
                    </div>
                  </article>
                </div>
              );
            }

            const propSnippet: PropertySnippet = {
              id: raw.id || "",
              title: raw.title || "Featured Luxury Property",
              location: raw.location || raw.city || "Mediterranean Coast",
              nightlyPrice: raw.nightlyPrice || raw.pricePerNight || raw.basePrice || (typeof raw.price === "number" ? raw.price : 450),
              rating: raw.rating || 4.95,
              reviewCount: raw.reviewCount || raw.reviewsCount || 48,
              imageUrl: raw.imageUrl || raw.coverImageUrl || "https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?auto=format&fit=crop&w=1200&q=80",
              features: raw.features || raw.amenities || ["Sea View", "Infinity Pool", "Private Terrace", "Concierge"],
              bedrooms: raw.bedrooms || 3,
              bathrooms: raw.bathrooms || 3,
              maxGuests: raw.maxGuests || 6,
              description: raw.description,
            };

            return (
              <PropertyDetailsShowcaseCard
                key={idx}
                property={propSnippet}
                onReserve={() => onQuickPrompt(`I would like to book ${propSnippet.title}`)}
                onAskLumen={(q) => onQuickPrompt(q)}
              />
            );
          }

          case "property_list": {
            const rawList = block.data?.properties || block.data?.items || [];
            if (!Array.isArray(rawList) || rawList.length === 0) return null;

            const snippets: PropertySnippet[] = rawList.map((raw: any) => ({
              id: raw.id || "",
              title: raw.title || "Luxury Retreat",
              location: raw.location || raw.city || "Greece",
              nightlyPrice: raw.nightlyPrice || raw.pricePerNight || raw.basePrice || 400,
              rating: raw.rating || 4.9,
              reviewCount: raw.reviewCount || 32,
              imageUrl: raw.imageUrl || raw.coverImageUrl || "https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?auto=format&fit=crop&w=1200&q=80",
              features: raw.features || raw.amenities || ["Sea View", "Pool"],
              bedrooms: raw.bedrooms || 2,
              bathrooms: raw.bathrooms || 2,
              maxGuests: raw.maxGuests || 4,
              description: raw.description,
            }));

            return (
              <ToolResultCarousel
                key={idx}
                properties={snippets}
                onSelectProperty={(id) => onQuickPrompt(`Show details for property ${id}`)}
              />
            );
          }

          case "vision_search_results":
          case "vision_results": {
            const rawData = block.data || {};
            const items = rawData.results || rawData.items || block.items || [];
            return (
              <VisionSearchResultsCard
                key={idx}
                data={{
                  results: items,
                  queryImagePreviewUrl: rawData.queryImagePreviewUrl,
                  textQuery: rawData.textQuery,
                  totalFound: rawData.totalFound || items.length,
                }}
                onQuickPrompt={onQuickPrompt}
                onSelectProperty={(id) => onQuickPrompt(`Show details for property ${id}`)}
              />
            );
          }

          case "availability": {
            console.log(block)
            const raw = block.data || {};
            return (
              <AvailabilityCalendarStripCard
                key={idx}
                data={raw as any}
                onSelectDateRange={(_start, _end, _total, dateSummary) =>
                  onQuickPrompt(`Check price and availability for stay ${dateSummary || ""}`)
                }
              />
            );
          }

          case "booking":
          case "booking_status": {
            const raw = block.data || {};
            if (!raw || (!raw.propertyTitle && !raw.bookingId && !raw.id && !raw.accessCode && !raw.checkInDate)) {
              return null;
            }

            return (
              <BookingStatusTimelineCard
                key={idx}
                data={raw as any}
                onMessageHost={() => onQuickPrompt("Message Host regarding reservation")}
              />
            );
          }

          case "price_breakdown": {
            const raw = block.data || {};
            const getCurrencySymbol = (c?: string) => {
              if (!c) return "€";
              if (c === "EUR" || c === "€") return "€";
              if (c === "USD" || c === "$") return "$";
              if (c === "GBP" || c === "£") return "£";
              return c + " ";
            };
            const curr = getCurrencySymbol(raw.currency);
            const total = Number(raw.total ?? raw.totalPrice ?? raw.totalAmount ?? raw.amount ?? 0);
            const basePrice = Number(raw.basePrice ?? raw.nightlyPrice ?? raw.nightlyRate ?? 0);

            const rawItems = raw.items || raw.breakdown || raw.lineItems || raw.fees;
            let items: any[] = Array.isArray(rawItems) && rawItems.length > 0 ? rawItems : [];

            if (items.length === 0 && total > 0) {
              if (basePrice > 0 && total >= basePrice) {
                const fees = Math.round((total - basePrice) * 100) / 100;
                items = [
                  { label: "Nightly Rate & Accommodation", amount: basePrice },
                  fees > 0 ? { label: "Taxes, Cleaning & Hospitality Fees", amount: fees } : null,
                ].filter(Boolean);
              } else {
                const stayEst = Math.round(total * 0.85);
                const feesEst = Math.round((total - stayEst) * 100) / 100;
                items = [
                  { label: "Accommodations Stay", amount: stayEst },
                  { label: "Taxes, Cleaning & Hospitality Fees", amount: feesEst },
                ];
              }
            }

            const formatMoney = (val: any) => {
              if (typeof val === "number") {
                return Number(val || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
              }
              return val;
            };

            return (
              <div key={idx} className="price-breakdown-card animate-fade-in">
                <div className="price-breakdown-header">
                  <span className="price-breakdown-icon">🏷️</span>
                  <h4 className="price-breakdown-title">{raw.title || "Price Breakdown & Fees"}</h4>
                </div>

                <div className="price-breakdown-items">
                  {items.map((item: any, i: number) => {
                    const isDiscount = typeof item.amount === "number" && item.amount < 0;
                    return (
                      <div key={i} className={`price-breakdown-row ${isDiscount ? "discount-row" : ""}`}>
                        <span className="price-row-label">{item.label || item.description || item.name || "Charge"}</span>
                        <span className="price-row-amount">
                          {isDiscount ? `-${curr}${formatMoney(Math.abs(item.amount))}` : `${curr}${formatMoney(item.amount)}`}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <div className="price-breakdown-total">
                  <span>Total Investment</span>
                  <span className="total-highlight">{curr}{formatMoney(total)}</span>
                </div>
              </div>
            );
          }

          case "payment":
          case "payment_prompt":
          case "payment_status": {
            const raw = (block.data || {}) as any;
            const bId =
              raw.bookingId ||
              raw.booking_id ||
              raw.id ||
              raw.reservationId ||
              raw.reservation_id ||
              (block as any).bookingId ||
              "";
            const clientSecret =
              raw.clientSecret ||
              raw.client_secret ||
              raw.paymentIntentClientSecret ||
              raw.payment_intent_client_secret ||
              raw.token ||
              (block as any).clientSecret ||
              "";
            const isPaid =
              raw.status === "PAID" ||
              raw.status === "COMPLETED" ||
              raw.status === "SUCCEEDED";

            const paymentData: PaymentPromptData = {
              id: raw.id || raw.paymentIntentId || bId || "pay",
              bookingRef: raw.bookingRef || raw.booking_ref || bId || "AGG-PAY",
              bookingId: bId,
              propertyTitle: raw.propertyTitle || raw.title || raw.name || "Confirmed Luxury Stay",
              totalAmount:
                raw.totalAmount ??
                raw.total ??
                raw.totalPrice ??
                raw.amount ??
                raw.payableNow ??
                (raw.basePrice ? raw.basePrice * 3 : 1405),
              currency: raw.currency || "€",
              clientSecret: clientSecret,
              paymentIntentId: raw.paymentIntentId || raw.payment_intent_id || "",
              status: isPaid ? "PAID" : (raw.status || "PENDING"),
              datesSummary: raw.datesSummary || raw.dates || "Selected Dates",
              guestSummary: raw.guestSummary || (raw.guests ? `${raw.guests} Guests` : "2 Guests"),
            };

            return (
              <PaymentPromptCard
                key={idx}
                data={paymentData}
                onPaySuccess={async (_methodId, _amount, _secret) => {
                  try {
                    await AggarlyChatBridgeClient.confirmPayment(
                      paymentData.bookingId,
                      _methodId,
                      _secret || paymentData.clientSecret,
                      {
                        propertyTitle: paymentData.propertyTitle,
                        totalAmount: _amount,
                        currency: paymentData.currency,
                      }
                    );
                  } catch (e) {
                    console.error("Payment confirmation error:", e);
                  }
                  onQuickPrompt("I have completed the payment via Stripe. What is the check-in timeline & lockbox code?");
                }}
              />
            );
          }

          case "confirmation":
          case "action_card":
          case "confirmation_required": {
            const rawData = (block.data || {}) as any;
            const tok =
              rawData.confirmationToken ||
              rawData.token ||
              rawData.confirmation_token ||
              (block as any).confirmationToken ||
              (block as any).token ||
              "";
            const isConfirmed = rawData.status === "CONFIRMED";

            const cardData = {
              id: rawData.id || `conf-${idx}`,
              token: tok,
              actionType: rawData.actionType || "BOOKING",
              title: rawData.title || rawData.pendingToolName || "Confirmation Required",
              propertyTitle: rawData.propertyTitle || "Aggarly Reservation",
              dateRange: rawData.dateRange || "Pending Authorization",
              guestSummary: rawData.guestSummary || "Guest Request",
              totalPrice: rawData.totalPrice || rawData.total || 0,
              currency: rawData.currency || "€",
              status: isConfirmed ? "CONFIRMED" : (rawData.status || "PENDING"),
              details: rawData.details,
            };
            return (
              <ConfirmationCard
                key={idx}
                data={cardData}
                onConfirm={async (tokenToConfirm) => {
                  await onConfirmAction(tokenToConfirm || tok);
                }}
              />
            );
          }

          case "memory_consent":
          case "memory": {
            const rawData: any = block.data || {};
            const consentData = {
              id: rawData.id || `mem-consent-${idx}`,
              memoryKey: rawData.memoryKey || rawData.key || "preference",
              memoryValue: rawData.memoryValue || rawData.value || rawData.content || "",
              label: rawData.label || rawData.title || rawData.memoryValue || rawData.value || "Personal Preference",
              category: rawData.category || "Personal Preference",
              status: rawData.status || "PENDING",
            };

            return (
              <MemoryConsentCard
                key={idx}
                data={consentData}
                onConfirm={async (memData) => {
                  if (onConfirmMemory) {
                    await onConfirmMemory(memData);
                  } else {
                    await AggarlyChatBridgeClient.saveMemory({
                      id: `mem-${Date.now()}`,
                      key: memData.memoryKey,
                      value: memData.memoryValue,
                      label: memData.label,
                      category: "Personal Preference",
                      createdAt: "Just now",
                    });
                  }
                }}
              />
            );
          }

          case "actions": {
            return (
              <div key={idx} className="quick-actions-container">
                <div className="quick-actions-wrap">
                  {block.items?.map((action: any, i: number) => {
                    const label = action.label || action.title || action.id || action;
                    const hasInput = action.requiresInput || (action.inputs && action.inputs.length > 0);
                    return (
                      <button
                        key={i}
                        onClick={() => handleActionClick(action)}
                        className={`quick-action-chip ${hasInput ? "has-input-action" : ""}`}
                        title={action.action ? `Execute ${action.action}` : label}
                      >
                        {hasInput && <span className="action-input-indicator">✏️</span>}
                        {label}
                      </button>
                    );
                  })}
                </div>

                {/* Interactive Action Input Dialog */}
                {activeInputModal && (
                  <form onSubmit={handleInputModalSubmit} className="action-input-card animate-fade-in">
                    <div className="action-input-header">
                      <div className="action-input-badge">
                        <span>💬</span>
                        <span>{activeInputModal.actionItem.label || "Action Required"}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setActiveInputModal(null)}
                        className="action-input-close"
                      >
                        ✕
                      </button>
                    </div>

                    <div className="action-input-fields">
                      {(activeInputModal.actionItem.inputs || [
                        { name: "message", type: "textarea", label: "Message / Input", placeholder: "Type here...", required: true },
                      ]).map((inp: LumenActionInput, fieldIdx: number) => (
                        <div key={fieldIdx} className="action-input-field-group">
                          <label className="action-input-label">
                            {inp.label || inp.name}
                            {inp.required && <span className="required-star">*</span>}
                          </label>
                          {inp.type === "textarea" ? (
                            <textarea
                              rows={3}
                              className="action-input-textarea"
                              placeholder={inp.placeholder || "Type here..."}
                              required={inp.required}
                              value={activeInputModal.values[inp.name] || ""}
                              onChange={(e) =>
                                setActiveInputModal((prev) =>
                                  prev
                                    ? { ...prev, values: { ...prev.values, [inp.name]: e.target.value } }
                                    : null
                                )
                              }
                            />
                          ) : (
                            <input
                              type={inp.type || "text"}
                              className="action-input-text"
                              placeholder={inp.placeholder || ""}
                              required={inp.required}
                              value={activeInputModal.values[inp.name] || ""}
                              onChange={(e) =>
                                setActiveInputModal((prev) =>
                                  prev
                                    ? { ...prev, values: { ...prev.values, [inp.name]: e.target.value } }
                                    : null
                                )
                              }
                            />
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="action-input-footer">
                      <button
                        type="button"
                        onClick={() => setActiveInputModal(null)}
                        className="btn-cancel-action"
                      >
                        Cancel
                      </button>
                      <button type="submit" className="btn-submit-action">
                        Submit & Send
                      </button>
                    </div>
                  </form>
                )}
              </div>
            );
          }

          case "compare":
          case "property_compare": {
            const raw = block.data || {};
            const rawProps = raw.properties || raw.items || (Array.isArray(raw) ? raw : []);
            const normProperties = (Array.isArray(rawProps) ? rawProps : []).map((p: any) => ({
              id: p.id || p.propertyId || "",
              title: p.title || "Sanctuary",
              location: p.location || p.city || "Mediterranean Coast",
              nightlyPrice: Number(p.nightlyPrice ?? p.pricePerNight ?? p.basePrice ?? 450),
              rating: Number(p.rating ?? 4.95),
              imageUrl: p.imageUrl || p.coverImageUrl || "https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?auto=format&fit=crop&w=1200&q=80",
              bedrooms: Number(p.bedrooms ?? 2),
              bathrooms: Number(p.bathrooms ?? 2),
              maxGuests: Number(p.maxGuests ?? 4),
              poolType: p.poolType || "Private Infinity Pool",
              seaDistance: p.seaDistance || "Direct Seafront",
              cancellationPolicy: p.cancellationPolicy || "Flexible 48h",
              chefAvailable: Boolean(p.chefAvailable ?? true),
            }));

            if (normProperties.length === 0) return null;

            const compareData: PropertyCompareData = {
              title: raw.title || "Curated Sanctuary Comparison",
              subtitle: raw.subtitle || "Side-by-side architectural and wellness breakdown",
              properties: normProperties,
            };

            return (
              <PropertyCompareCard
                key={idx}
                data={compareData}
                onSelectProperty={(id, title) => onQuickPrompt(`Show details for ${title} (${id})`)}
              />
            );
          }

          case "cancellation_policy": {
            const raw = block.data || {};
            const policyData: CancellationPolicyData = {
              title: raw.title || "Luxury Sanctuary Cancellation Policy",
              tier: raw.tier || "MODERATE",
              fullRefundCutoff: raw.fullRefundCutoff || "14 Days Prior",
              halfRefundCutoff: raw.halfRefundCutoff || "7 Days Prior",
              policyNotes: raw.policyNotes || raw.notes || [
                "Full refund minus 3% processing fee if cancelled before cutoff.",
                "50% refund up to 7 days before check-in.",
                "Non-refundable within 7 days of arrival.",
              ],
            };
            return (
              <CancellationPolicyCard
                key={idx}
                data={policyData}
                onAskRefund={() => onQuickPrompt("What would be my refund amount if I cancel now?")}
              />
            );
          }

          case "private_chef":
          case "experience":
          case "chef": {
            const raw = block.data || {};
            const rawCourses = raw.menuCourses || raw.courses || raw.menu || [
              { course: "Amuse-Bouche", dish: "Santorini Smoked Aubergine Tartlet" },
              { course: "First Course", dish: "Hand-Dived Scallop Carpaccio" },
              { course: "Main Course", dish: "Charred Mediterranean Seabass" },
              { course: "Dessert", dish: "Dark Chocolate & Olive Oil Ganache" },
            ];
            const chefData: PrivateChefExperienceData = {
              chefName: raw.chefName || "Chef Elena Rostova",
              chefTitle: raw.chefTitle || "Executive Private Chef",
              chefAvatar: raw.chefAvatar || "https://images.unsplash.com/photo-1577219491135-ce391730fb2c?auto=format&fit=crop&w=400&q=80",
              experienceTitle: raw.experienceTitle || "Nocturnal Mediterranean Tasting Journey",
              price: Number(raw.price ?? 280),
              currency: raw.currency || "€",
              guestCount: Number(raw.guestCount ?? raw.guests ?? 2),
              description: raw.description || "Four courses inspired by Aegean coastal terroir, prepared live in your private villa kitchen.",
              menuCourses: (Array.isArray(rawCourses) ? rawCourses : []).map((c: any) => ({
                course: c.course || c.title || "Course",
                dish: c.dish || c.name || c.description || "Chef Speciality",
              })),
              dietaryOptions: raw.dietaryOptions || ["Gluten-Free", "Vegetarian", "Pescatarian", "Dairy-Free"],
              status: raw.status || "PENDING",
            };
            return (
              <PrivateChefExperienceCard
                key={idx}
                data={chefData}
                onConfirmChef={(opts) =>
                  onQuickPrompt(`I would like to confirm the private chef experience with dietary preferences: ${opts.join(", ") || "Standard tasting"}`)
                }
              />
            );
          }

          case "weather":
          case "weather_forecast": {
            const raw = block.data || {};
            const weatherData: WeatherForecastData = {
              location: raw.location || raw.city || "Coastal Sanctuary",
              seaTemperature: raw.seaTemperature || "23°C",
              days: raw.days || [
                { day: "Mon", date: "Jun 12", condition: "sunny", tempHigh: 28, tempLow: 21, uvIndex: 7 },
                { day: "Tue", date: "Jun 13", condition: "clear", tempHigh: 29, tempLow: 22, uvIndex: 8 },
                { day: "Wed", date: "Jun 14", condition: "partly-cloudy", tempHigh: 27, tempLow: 20, uvIndex: 6 },
                { day: "Thu", date: "Jun 15", condition: "sunny", tempHigh: 30, tempLow: 22, uvIndex: 8 },
                { day: "Fri", date: "Jun 16", condition: "breezy", tempHigh: 26, tempLow: 19, uvIndex: 6 },
              ],
              generalAdvice: raw.generalAdvice || "Calm seas and pristine nocturnal starlight anticipated across the bay.",
            };
            return (
              <WeatherForecastWidgetCard
                key={idx}
                data={weatherData}
              />
            );
          }

          case "faq":
          case "support_faq": {
            const raw = block.data || {};
            const items = raw.items || raw.faqs || [];
            if (!Array.isArray(items) || items.length === 0) return null;
            const faqData: SupportFaqData = {
              topic: raw.topic || "Frequently Asked Questions",
              items: items.map((it: any) => ({
                question: it.question || it.q || "",
                answer: it.answer || it.a || "",
              })),
            };
            return <SupportFaqCard key={idx} data={faqData} />;
          }

          case "warning": {
            const raw = block.data || {};
            if (raw.tier || raw.fullRefundCutoff || raw.policyNotes) {
              const policyData: CancellationPolicyData = {
                title: raw.title || "Cancellation Policy & Terms",
                tier: raw.tier || "MODERATE",
                fullRefundCutoff: raw.fullRefundCutoff || "14 Days Prior",
                halfRefundCutoff: raw.halfRefundCutoff || "7 Days Prior",
                policyNotes: raw.policyNotes || [raw.message || "Standard sanctuary cancellation conditions apply."],
              };
              return (
                <CancellationPolicyCard
                  key={idx}
                  data={policyData}
                  onAskRefund={() => onQuickPrompt("What would be my refund amount if I cancel now?")}
                />
              );
            }
            return (
              <div key={idx} className="alert-warning-box animate-fade-in">
                <span className="alert-icon">⚠️</span>
                <span>{block.data?.message || block.content || "Notice regarding this action."}</span>
              </div>
            );
          }

          case "html":
          case "html_block":
          case "iframe":
          case "embed":
          case "webview": {
            const rawData = (block.data || {}) as any;
            const htmlContent =
              rawData.html ||
              (block as any).html ||
              block.content ||
              (typeof rawData === "string" ? rawData : "");
            const height =
              rawData.height ||
              (block as any).height ||
              480;
            let title = rawData.title || (block as any).title;
            if (!title && htmlContent && typeof htmlContent === "string") {
              const titleMatch = htmlContent.match(/<title[^>]*>([^<]+)<\/title>/i);
              if (titleMatch && titleMatch[1]) {
                title = titleMatch[1].trim();
              }
            }
            if (!title) {
              title = "Interactive Tool";
            }
            const badge =
              rawData.badge ||
              (block as any).badge ||
              "Interactive Tool";
            const src = rawData.src || (block as any).src || "";

            return (
              <HtmlEmbedBlockCard
                key={idx}
                data={{
                  ...rawData,
                  html: htmlContent,
                  height,
                  title,
                  badge,
                  src,
                }}
                content={htmlContent}
                onQuickPrompt={onQuickPrompt}
                onExecuteAction={onExecuteAction}
              />
            );
          }

          case "scheduled_task":
          case "schedule":
          case "scheduled_task_list": {
            const rawData: any = block.data || {};
            const tasks: any[] = Array.isArray(rawData)
              ? rawData
              : Array.isArray(rawData.tasks)
              ? rawData.tasks
              : Array.isArray(rawData.items)
              ? rawData.items
              : (rawData.id || rawData.taskId || rawData.name)
              ? [rawData]
              : [];

            if (tasks.length === 0) return null;

            return (
              <div key={idx} className="scheduled-tasks-list" style={{ display: "flex", flexDirection: "column", gap: "10px", margin: "6px 0" }}>
                {tasks.map((t, tIdx) => (
                  <ScheduledTaskCard
                    key={t.id || t.taskId || tIdx}
                    task={t}
                    onRefresh={() => onQuickPrompt("Show my active automated schedules")}
                  />
                ))}
              </div>
            );
          }

          case "ui_command":
          case "ui_command_result":
          case "execution":
          case "execution_steps":
          case "activity":
          case "activity_steps": {
            const raw = (block.data || {}) as any;
            const action = raw.action || raw.command || "Browser Action";
            const target = raw.target || raw.element || "";
            const status = raw.status || (raw.done ? "COMPLETED" : "EXECUTING");
            const screenshot = raw.screenshotUrl || raw.screenshot || "";
            return (
              <div key={idx} className="p-3 my-2 rounded-xl bg-stone-900/90 border border-amber-500/30 text-xs shadow-md">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-semibold text-amber-300 flex items-center gap-1.5 font-mono">
                    ⚡ {String(action).toUpperCase()}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20 font-mono">
                    {status}
                  </span>
                </div>
                {target && (
                  <p className="text-stone-300 text-[11px]">
                    Target: <code className="bg-stone-800 px-1 py-0.5 rounded text-amber-200">{String(target)}</code>
                  </p>
                )}
                {raw.value && <p className="text-stone-400 text-[11px] mt-0.5">Value: "{String(raw.value)}"</p>}
                {screenshot && (
                  <div className="mt-2 rounded-lg overflow-hidden border border-stone-800">
                    <img src={screenshot} alt="Action Screenshot" className="w-full max-h-48 object-cover object-top" />
                  </div>
                )}
              </div>
            );
          }

          case "execution_plan":
          case "thought":
          case "thoughts":
          case "tool_execution":
          case "steps": {
            return null;
          }

          default:
            return null;
        }
      })}
    </div>
  );
};
