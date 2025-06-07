import React, { useState, useEffect, useRef } from 'react';
import Webcam from 'react-webcam';
import { BrowserBarcodeReader } from '@zxing/library';
import { 
  Camera, 
  Plus, 
  Target, 
  TrendingUp, 
  Apple, 
  Search,
  X,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import './App.css';

const App = () => {
  const [currentView, setCurrentView] = useState('dashboard');
  const [dailyCalories, setDailyCalories] = useState(0);
  const [calorieGoal, setCalorieGoal] = useState(2000);
  const [foodItems, setFoodItems] = useState([]);
  const [isScanning, setIsScanning] = useState(false);
  const [scannedProduct, setScannedProduct] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [notification, setNotification] = useState(null);
  const [serving, setServing] = useState(100);
  
  const webcamRef = useRef(null);
  const codeReader = useRef(new BrowserBarcodeReader());

  useEffect(() => {
    const savedData = localStorage.getItem('calorieData');
    if (savedData) {
      const data = JSON.parse(savedData);
      setFoodItems(data.foodItems || []);
      setDailyCalories(data.dailyCalories || 0);
      setCalorieGoal(data.calorieGoal || 2000);
    }
  }, []);

  useEffect(() => {
    const dataToSave = {
      foodItems,
      dailyCalories,
      calorieGoal
    };
    localStorage.setItem('calorieData', JSON.stringify(dataToSave));
  }, [foodItems, dailyCalories, calorieGoal]);

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const searchProducts = async (query) => {
    if (!query.trim()) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(`https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&json=1&page_size=10`);
      const data = await response.json();
      
      const formattedResults = data.products
        ?.filter(product => product.product_name && product.nutriments)
        ?.map(product => ({
          name: product.product_name,
          brand: product.brands || 'Unknown Brand',
          calories: Math.round(product.nutriments.energy_kcal_100g || product.nutriments['energy-kcal_100g'] || 0),
          protein: Math.round(product.nutriments.proteins_100g || 0),
          carbs: Math.round(product.nutriments.carbohydrates_100g || 0),
          fat: Math.round(product.nutriments.fat_100g || 0),
          barcode: product.code,
          image: product.image_url
        })) || [];
      
      setSearchResults(formattedResults);
    } catch (error) {
      console.error('Search error:', error);
      showNotification('Search failed. Please try again.', 'error');
    }
    setIsLoading(false);
  };

  const fetchProductByBarcode = async (barcode) => {
    setIsLoading(true);
    try {
      const response = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`);
      const data = await response.json();
      
      if (data.status === 1 && data.product) {
        const product = data.product;
        const productData = {
          name: product.product_name || 'Unknown Product',
          brand: product.brands || 'Unknown Brand',
          calories: Math.round(product.nutriments.energy_kcal_100g || product.nutriments['energy-kcal_100g'] || 0),
          protein: Math.round(product.nutriments.proteins_100g || 0),
          carbs: Math.round(product.nutriments.carbohydrates_100g || 0),
          fat: Math.round(product.nutriments.fat_100g || 0),
          barcode: product.code,
          image: product.image_url
        };
        
        setScannedProduct(productData);
        setIsScanning(false);
        showNotification('Product found!', 'success');
      } else {
        showNotification('Product not found in database', 'error');
        setIsScanning(false);
      }
    } catch (error) {
      console.error('API error:', error);
      showNotification('Error fetching product data', 'error');
      setIsScanning(false);
    }
    setIsLoading(false);
  };

  const handleScan = async () => {
    if (!webcamRef.current) return;

    try {
      const video = webcamRef.current.video;
      if (video && video.readyState === video.HAVE_ENOUGH_DATA) {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0);
        
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        try {
          const code = await codeReader.current.decodeFromImageData(imageData);
          if (code) {
            await fetchProductByBarcode(code.text);
          }
        } catch (error) {
          // No barcode found, continue scanning
        }
      }
    } catch (error) {
      console.error('Scan error:', error);
    }
  };

  useEffect(() => {
    let interval;
    if (isScanning) {
      interval = setInterval(handleScan, 1000);
    }
    return () => clearInterval(interval);
  }, [isScanning]);

  const addFoodItem = (product, serving = 100) => {
    const calories = Math.round((product.calories * serving) / 100);
    const newItem = {
      id: Date.now(),
      name: product.name,
      brand: product.brand,
      calories,
      serving,
      addedAt: new Date().toLocaleTimeString()
    };
    
    setFoodItems(prev => [...prev, newItem]);
    setDailyCalories(prev => prev + calories);
    setScannedProduct(null);
    setCurrentView('dashboard');
    showNotification(`Added ${product.name} (${calories} cal)`, 'success');
  };

  const removeFoodItem = (id) => {
    const item = foodItems.find(item => item.id === id);
    if (item) {
      setFoodItems(prev => prev.filter(item => item.id !== id));
      setDailyCalories(prev => prev - item.calories);
      showNotification('Food item removed', 'success');
    }
  };

  const resetDay = () => {
    setFoodItems([]);
    setDailyCalories(0);
    showNotification('Daily intake reset', 'success');
  };

  const progressPercentage = Math.min((dailyCalories / calorieGoal) * 100, 100);

  const renderDashboard = () => (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
      {notification && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-2 rounded-lg shadow-lg ${
          notification.type === 'success' ? 'bg-green-500' : 'bg-red-500'
        } text-white flex items-center gap-2`}>
          {notification.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
          {notification.message}
        </div>
      )}
      
      <div className="container mx-auto px-4 py-6">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">CalorieScan</h1>
          <p className="text-gray-600">Track calories with smart barcode scanning</p>
        </header>

        <div className="max-w-md mx-auto mb-8">
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="text-center mb-4">
              <h2 className="text-2xl font-semibold text-gray-800">Today's Progress</h2>
              <div className="text-4xl font-bold text-blue-600 mt-2">
                {dailyCalories} <span className="text-lg text-gray-500">/ {calorieGoal} cal</span>
              </div>
            </div>
            
            <div className="w-full bg-gray-200 rounded-full h-4 mb-4">
              <div 
                className="bg-gradient-to-r from-blue-500 to-green-500 h-4 rounded-full transition-all duration-500"
                style={{ width: `${progressPercentage}%` }}
              ></div>
            </div>
            
            <div className="text-center text-sm text-gray-600">
              {calorieGoal - dailyCalories > 0 
                ? `${calorieGoal - dailyCalories} calories remaining`
                : 'Goal reached! 🎉'
              }
            </div>
          </div>
        </div>

        <div className="flex gap-3 mb-6 max-w-md mx-auto">
          <button
            onClick={() => setCurrentView('scan')}
            className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white py-3 px-6 rounded-xl font-semibold flex items-center justify-center gap-2 hover:from-blue-600 hover:to-blue-700 transform hover:scale-105 transition-all"
          >
            <Camera size={20} />
            Scan Barcode
          </button>
          
          <button
            onClick={() => setCurrentView('search')}
            className="flex-1 bg-gradient-to-r from-green-500 to-green-600 text-white py-3 px-6 rounded-xl font-semibold flex items-center justify-center gap-2 hover:from-green-600 hover:to-green-700 transform hover:scale-105 transition-all"
          >
            <Search size={20} />
            Search Food
          </button>
        </div>

        <div className="max-w-md mx-auto">
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-gray-800">Today's Food</h3>
              {foodItems.length > 0 && (
                <button
                  onClick={resetDay}
                  className="text-red-500 text-sm hover:text-red-700"
                >
                  Reset Day
                </button>
              )}
            </div>
            
            {foodItems.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Apple size={48} className="mx-auto mb-3 opacity-50" />
                <p>No food logged today</p>
                <p className="text-sm">Scan or search to add items</p>
              </div>
            ) : (
              <div className="space-y-3">
                {foodItems.map((item) => (
                  <div key={item.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <div>
                      <div className="font-medium text-gray-800">{item.name}</div>
                      <div className="text-sm text-gray-600">{item.brand} • {item.serving}g • {item.addedAt}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-blue-600">{item.calories} cal</span>
                      <button
                        onClick={() => removeFoodItem(item.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const renderScanner = () => (
    <div className="min-h-screen bg-black">
      <div className="relative">
        <button
          onClick={() => {
            setIsScanning(false);
            setCurrentView('dashboard');
          }}
          className="absolute top-4 left-4 z-10 bg-white rounded-full p-2 shadow-lg"
        >
          <X size={24} />
        </button>
        
        <div className="text-center text-white p-4">
          <h2 className="text-xl font-semibold mb-2">Scan Product Barcode</h2>
          <p className="text-gray-300">Position barcode within the frame</p>
        </div>

        <div className="relative mx-4">
          <Webcam
            ref={webcamRef}
            videoConstraints={{
              facingMode: 'environment',
              width: 1280,
              height: 720
            }}
            className="w-full rounded-lg"
            onUserMedia={() => setIsScanning(true)}
          />
          
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="border-2 border-white rounded-lg w-64 h-32 flex items-center justify-center">
              <Target className="text-white" size={48} />
            </div>
          </div>
        </div>

        {isLoading && (
          <div className="text-center text-white mt-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto"></div>
            <p className="mt-2">Processing...</p>
          </div>
        )}
      </div>
    </div>
  );

  const renderSearch = () => (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
      <div className="container mx-auto px-4 py-6">
        <header className="flex items-center gap-4 mb-6">
          <button
            onClick={() => setCurrentView('dashboard')}
            className="p-2 rounded-full bg-white shadow-lg"
          >
            <X size={24} />
          </button>
          <h1 className="text-2xl font-bold text-gray-800">Search Food</h1>
        </header>

        <div className="max-w-md mx-auto mb-6">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && searchProducts(searchQuery)}
              placeholder="Search for food items..."
              className="w-full py-3 px-4 pr-12 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <button
              onClick={() => searchProducts(searchQuery)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-blue-500"
            >
              <Search size={20} />
            </button>
          </div>
        </div>

        {isLoading && (
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-2 text-gray-600">Searching...</p>
          </div>
        )}

        <div className="max-w-md mx-auto space-y-3">
          {searchResults.map((product, index) => (
            <div key={index} className="bg-white rounded-xl shadow-lg p-4">
              <div className="flex gap-3">
                {product.image && (
                  <img 
                    src={product.image} 
                    alt={product.name}
                    className="w-16 h-16 object-cover rounded-lg"
                  />
                )}
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-800">{product.name}</h3>
                  <p className="text-sm text-gray-600">{product.brand}</p>
                  <div className="flex gap-4 text-xs text-gray-500 mt-1">
                    <span>{product.calories} cal/100g</span>
                    <span>P: {product.protein}g</span>
                    <span>C: {product.carbs}g</span>
                    <span>F: {product.fat}g</span>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setScannedProduct(product);
                    setCurrentView('add');
                  }}
                  className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
                >
                  <Plus size={20} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderAddFood = () => {
    const [serving, setServing] = useState(100);
    const calculatedCalories = Math.round((scannedProduct.calories * serving) / 100);

    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
        <div className="container mx-auto px-4 py-6">
          <header className="flex items-center gap-4 mb-6">
            <button
              onClick={() => {
                setScannedProduct(null);
                setCurrentView('dashboard');
              }}
              className="p-2 rounded-full bg-white shadow-lg"
            >
              <X size={24} />
            </button>
            <h1 className="text-2xl font-bold text-gray-800">Add Food</h1>
          </header>

          <div className="max-w-md mx-auto">
            <div className="bg-white rounded-2xl shadow-lg p-6">
              {scannedProduct.image && (
                <img 
                  src={scannedProduct.image} 
                  alt={scannedProduct.name}
                  className="w-full h-48 object-cover rounded-lg mb-4"
                />
              )}
              
              <h2 className="text-xl font-semibold text-gray-800 mb-2">{scannedProduct.name}</h2>
              <p className="text-gray-600 mb-4">{scannedProduct.brand}</p>
              
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{scannedProduct.calories}</div>
                  <div className="text-sm text-gray-600">cal/100g</div>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{calculatedCalories}</div>
                  <div className="text-sm text-gray-600">total calories</div>
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Serving Size (grams)
                </label>
                <input
                  type="number"
                  value={serving}
                  onChange={(e) => setServing(parseInt(e.target.value) || 0)}
                  className="w-full py-2 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  min="1"
                />
              </div>

              <div className="grid grid-cols-3 gap-2 text-sm text-gray-600 mb-6">
                <div className="text-center p-2 bg-gray-50 rounded">
                  <div className="font-medium">{Math.round(scannedProduct.protein * serving / 100)}g</div>
                  <div>Protein</div>
                </div>
                <div className="text-center p-2 bg-gray-50 rounded">
                  <div className="font-medium">{Math.round(scannedProduct.carbs * serving / 100)}g</div>
                  <div>Carbs</div>
                </div>
                <div className="text-center p-2 bg-gray-50 rounded">
                  <div className="font-medium">{Math.round(scannedProduct.fat * serving / 100)}g</div>
                  <div>Fat</div>
                </div>
              </div>

              <button
                onClick={() => addFoodItem(scannedProduct, serving)}
                className="w-full bg-gradient-to-r from-blue-500 to-green-500 text-white py-3 px-6 rounded-xl font-semibold hover:from-blue-600 hover:to-green-600 transform hover:scale-105 transition-all"
              >
                Add to Daily Intake
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="App">
      {currentView === 'dashboard' && renderDashboard()}
      {currentView === 'scan' && renderScanner()}
      {currentView === 'search' && renderSearch()}
      {currentView === 'add' && scannedProduct && renderAddFood()}
    </div>
  );
};

export default App;