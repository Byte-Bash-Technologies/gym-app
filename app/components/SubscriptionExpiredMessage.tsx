export function SubscriptionExpiredMessage() {
  const handleRenewSubscription = () => {
    const phoneNumber = "917010976271";
    const message = encodeURIComponent("Hello, I would like to renew my subscription for the fitness center management system.");
    window.open(`https://wa.me/${phoneNumber}?text=${message}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-800 bg-opacity-75">
      <div className="bg-white p-8 rounded-lg shadow-xl max-w-md w-full text-center">
        <h1 className="text-2xl font-bold mb-4">Subscription Expired</h1>
        <p className="mb-6">Please renew your subscription to continue using the app.</p>
        <button
          onClick={handleRenewSubscription}
          className="inline-block bg-purple-600 text-white px-6 py-2 rounded-md hover:bg-purple-700 transition-colors"
        >
          Renew Subscription
        </button>
      </div>
    </div>
  );
}

