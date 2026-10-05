import {
  DiscountClass,
  OrderDiscountSelectionStrategy,
} from '../generated/api';

/**
 * @typedef {import("../generated/api").CartInput} RunInput
 * @typedef {import("../generated/api").CartLinesDiscountsGenerateRunResult} CartLinesDiscountsGenerateRunResult
 */

/**
 * @param {RunInput} input
 * @returns {CartLinesDiscountsGenerateRunResult}
 */
export function cartLinesDiscountsGenerateRun(input) {
  const noDiscount = { operations: [] };

  const allowsOrderDiscount = input.discount.discountClasses.includes(
    DiscountClass.Order,
  );

  if (!allowsOrderDiscount || input.cart.lines.length === 0) {
    return noDiscount;
  }

  const subtotal = input.cart.lines.reduce(
    (total, line) => total + Number(line.cost.subtotalAmount.amount),
    0,
  );

  if (subtotal < 100) {
    return noDiscount;
  }

  return {
    operations: [
      {
        orderDiscountsAdd: {
          candidates: [
            {
              message: '10% de descuento desde 100',
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
