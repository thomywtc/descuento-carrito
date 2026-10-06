import {
  DiscountClass,
  OrderDiscountSelectionStrategy,
} from '../generated/api';

/**
 * @typedef {import("../generated/api").CartInput} RunInput
 * @typedef {import("../generated/api").CartLinesDiscountsGenerateRunResult} RunResult
 */

/**
 * @param {RunInput} input
 * @returns {RunResult}
 */
export function cartLinesDiscountsGenerateRun(input) {
  const noDiscount = { operations: [] };

  const allowsOrderDiscount = input.discount.discountClasses.includes(
    DiscountClass.Order,
  );

  if (!allowsOrderDiscount || input.cart.lines.length === 0) {
    return noDiscount;
  }

  const productIds = new Set();
  let subtotal = 0;

  for (const line of input.cart.lines) {
    subtotal += Number(line.cost.subtotalAmount.amount);

    if (line.merchandise.__typename === 'ProductVariant') {
      productIds.add(line.merchandise.product.id);
    }
  }

  if (subtotal < 100 || productIds.size < 3) {
    return noDiscount;
  }

  return {
    operations: [
      {
        orderDiscountsAdd: {
          candidates: [
            {
              message: '10% desde 100 con 3 productos distintos',
              targets: [
                {
                  orderSubtotal: {
                    excludedCartLineIds: [],
                  },
                },
              ],
              value: {
                percentage: {
                  value: 10,
                },
              },
            },
          ],
          selectionStrategy: OrderDiscountSelectionStrategy.First,
        },
      },
    ],
  };
}
