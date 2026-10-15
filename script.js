
const form = document.getElementById("currency-form");
const amountInput = document.getElementById("amount");
const fromCurrency = document.getElementById("from-currency");
const toCurrency = document.getElementById("to-currency");
const swapButton = document.getElementById("swap-button");

const result = document.getElementById("result");
const exchangeRate = document.getElementById("exchange-rate");
const statusText = document.getElementById("status");

const API_URL = "https://open.er-api.com/v6/latest/";

// Store rates so we don't fetch them repeatedly.
const ratesCache = new Map();

function formatMoney(amount, currency) {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: currency,
        maximumFractionDigits: 4
    }).format(amount);
}

async function getRates(currency) {
    if (ratesCache.has(currency)) {
        return ratesCache.get(currency);
    }

    const response = await fetch(`${API_URL}${currency}`);

    if (!response.ok) {
        throw new Error("Could not connect to the exchange-rate service.");
    }

    const data = await response.json();

    if (data.result !== "success" || !data.rates) {
        throw new Error("Exchange rates are temporarily unavailable.");
    }

    ratesCache.set(currency, data);
    return data;
}

async function convertCurrency() {
    const amount = Number(amountInput.value);
    const from = fromCurrency.value;
    const to = toCurrency.value;

    if (!Number.isFinite(amount) || amount <= 0) {
        result.textContent = "Enter a valid amount";
        exchangeRate.textContent = "";
        statusText.textContent = "Amount must be greater than zero.";
        return;
    }

    result.textContent = "Converting...";
    exchangeRate.textContent = "";
    statusText.textContent = "Fetching exchange rates...";

    try {
        const data = await getRates(from);
        const rate = data.rates[to];

        if (typeof rate !== "number" || !Number.isFinite(rate)) {
            throw new Error("This currency pair is not supported.");
        }

        const convertedAmount = amount * rate;

        result.textContent = formatMoney(convertedAmount, to);
        exchangeRate.textContent =
            `1 ${from} = ${rate.toLocaleString("en-US", {
                maximumFractionDigits: 6
            })} ${to}`;

        statusText.textContent =
            `Rates last updated: ${data.time_last_update_utc}`;

    } catch (error) {
        result.textContent = "Conversion failed";
        exchangeRate.textContent = "";
        statusText.textContent =
            error.message || "Check your internet and try again.";
    }
}

// Run conversion when the form is submitted.
form.addEventListener("submit", function (event) {
    event.preventDefault();
    convertCurrency();
});

// Swap the selected currencies.
swapButton.addEventListener("click", function () {
    const previousFrom = fromCurrency.value;

    fromCurrency.value = toCurrency.value;
    toCurrency.value = previousFrom;

    convertCurrency();
});

// Automatically recalculate when currencies change.
fromCurrency.addEventListener("change", convertCurrency);
toCurrency.addEventListener("change", convertCurrency);

// Convert the default amount when the page opens.
convertCurrency();


const refreshButton = document.getElementById("refresh-button");

// Refresh the exchange rates from the API.
refreshButton.addEventListener("click", async function () {
    const currency = fromCurrency.value;

    // Remove the cached rates for this currency.
    ratesCache.delete(currency);

    refreshButton.disabled = true;
    refreshButton.textContent = "Refreshing...";

    try {
        await convertCurrency();
    } finally {
        refreshButton.disabled = false;
        refreshButton.textContent = "↻ Refresh Exchange Rates";
    }
});

// Quick currency selection buttons.
document.querySelectorAll(".quick-buttons button").forEach(button => {
    button.addEventListener("click", function () {
        fromCurrency.value = this.dataset.from;
        toCurrency.value = this.dataset.to;

        convertCurrency();
    });
});
