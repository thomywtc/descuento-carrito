import "@shopify/ui-extensions/preact";
import {render} from "preact";
import {useState} from "preact/hooks";

export default async () => {
  render(<App />, document.body);
};

function App() {
  const [error, setError] = useState("");

  async function prepareDiscount() {
    setError("");

    const result = await shopify.discounts.updateDiscountClasses(["order"]);

    if (!result.success) {
      setError("No se pudo establecer la clase de descuento de pedido.");
      throw new Error("No se pudo configurar la clase de descuento.");
    }
  }

  return (
    <s-function-settings
      onSubmit={event => {
        event.waitUntil(prepareDiscount());
      }}
    >
      <s-section heading="Descuento por subtotal">
        {error ? <s-banner tone="critical">{error}</s-banner> : null}

        <s-paragraph>
          Aplica un 10% de descuento al pedido cuando el subtotal
          alcanza 100 y el carrito contiene al menos 3 productos
          distintos. Variantes o unidades del mismo producto
          cuentan como un solo producto.
        </s-paragraph>
      </s-section>
    </s-function-settings>
  );
}
