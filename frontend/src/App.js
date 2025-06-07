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
  AlertCircle,
  Heart,
  Moon,
  Sun,
  Download,
  Scale,
  Calendar,
  BarChart3,
  Coffee,
  Utensils,
  Cookie,
  ChefHat,
  Settings,
  Home,
  BookOpen,
  Activity
} from 'lucide-react';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays, isToday } from 'date-fns';
import { Line, Doughnut, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  BarElement
} from 'chart.js';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import './App.css';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  BarElement
);

const App = () => {
  const [currentView, setCurrentView] = useState('dashboard');
  const [dailyCalories, setDailyCalories] = useState(0);
  const [calorieGoal, setCalorieGoal] = useState(2000);
  const [proteinGoal, setProteinGoal] = useState(150);
  const [carbGoal, setCarbGoal] = useState(250);
  const [fatGoal, setFatGoal] = useState(65);
  const [dailyProtein, setDailyProtein] = useState(0);
  const [dailyCarbs, setDailyCarbs] = useState(0);
  const [dailyFat, setDailyFat] = useState(0);
  const [foodItems, setFoodItems] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [weightEntries, setWeightEntries] = useState([]);
  const [currentWeight, setCurrentWeight] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [scannedProduct, setScannedProduct] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [notification, setNotification] = useState(null);
  const [serving, setServing] = useState(100);
  const [selectedMeal, setSelectedMeal] = useState('breakfast');
  const [darkMode, setDarkMode] = useState(false);
  const [historicalData, setHistoricalData] = useState({});
  const [viewingDate, setViewingDate] = useState(new Date());
  
  const webcamRef = useRef(null);
  const codeReader = useRef(new BrowserBarcodeReader());
  const photoRef = useRef(null);

  const mealIcons = {
    breakfast: Coffee,
    lunch: Utensils,
    dinner: ChefHat,
    snacks: Cookie
  };

  useEffect(() => {
    const savedData = localStorage.getItem('calorieAppData');
    if (savedData) {
      const data = JSON.parse(savedData);
      setFoodItems(data.foodItems || []);
      setDailyCalories(data.dailyCalories || 0);
      setDailyProtein(data.dailyProtein || 0);
      setDailyCarbs(data.dailyCarbs || 0);
      setDailyFat(data.dailyFat || 0);
      setCalorieGoal(data.calorieGoal || 2000);
      setProteinGoal(data.proteinGoal || 150);
      setCarbGoal(data.carbGoal || 250);
      setFatGoal(data.fatGoal || 65);
      setFavorites(data.favorites || []);
      setWeightEntries(data.weightEntries || []);
      setHistoricalData(data.historicalData || {});
      setDarkMode(data.darkMode || false);
    }
  }, []);

  useEffect(() => {
    const dataToSave = {
      foodItems,
      dailyCalories,
      dailyProtein,
      dailyCarbs,
      dailyFat,
      calorieGoal,
      proteinGoal,
      carbGoal,
      fatGoal,
      favorites,
      weightEntries,
      historicalData,
      darkMode
    };
    localStorage.setItem('calorieAppData', JSON.stringify(dataToSave));
  }, [foodItems, dailyCalories, dailyProtein, dailyCarbs, dailyFat, calorieGoal, proteinGoal, carbGoal, fatGoal, favorites, weightEntries, historicalData, darkMode]);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

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
        setServing(100);
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

  const addFoodItem = (product, servingAmount = 100, meal = selectedMeal) => {
    const calories = Math.round((product.calories * servingAmount) / 100);
    const protein = Math.round((product.protein * servingAmount) / 100);
    const carbs = Math.round((product.carbs * servingAmount) / 100);
    const fat = Math.round((product.fat * servingAmount) / 100);
    
    const newItem = {
      id: Date.now(),
      name: product.name,
      brand: product.brand,
      calories,
      protein,
      carbs,
      fat,
      serving: servingAmount,
      meal,
      addedAt: new Date().toLocaleTimeString(),
      date: format(new Date(), 'yyyy-MM-dd')
    };
    
    setFoodItems(prev => [...prev, newItem]);
    setDailyCalories(prev => prev + calories);
    setDailyProtein(prev => prev + protein);
    setDailyCarbs(prev => prev + carbs);
    setDailyFat(prev => prev + fat);
    
    // Save to historical data
    const today = format(new Date(), 'yyyy-MM-dd');
    setHistoricalData(prev => ({
      ...prev,
      [today]: {
        calories: (prev[today]?.calories || 0) + calories,
        protein: (prev[today]?.protein || 0) + protein,
        carbs: (prev[today]?.carbs || 0) + carbs,
        fat: (prev[today]?.fat || 0) + fat,
        items: [...(prev[today]?.items || []), newItem]
      }
    }));
    
    setScannedProduct(null);
    setServing(100);
    setCurrentView('dashboard');
    showNotification(`Added ${product.name} to ${meal} (${calories} cal)`, 'success');
  };

  const addToFavorites = (product) => {
    const favorite = {
      id: Date.now(),
      name: product.name,
      brand: product.brand,
      calories: product.calories,
      protein: product.protein,
      carbs: product.carbs,
      fat: product.fat,
      image: product.image
    };
    
    setFavorites(prev => [...prev, favorite]);
    showNotification('Added to favorites!', 'success');
  };

  const removeFoodItem = (id) => {
    const item = foodItems.find(item => item.id === id);
    if (item) {
      setFoodItems(prev => prev.filter(item => item.id !== id));
      setDailyCalories(prev => prev - item.calories);
      setDailyProtein(prev => prev - item.protein);
      setDailyCarbs(prev => prev - item.carbs);
      setDailyFat(prev => prev - item.fat);
      showNotification('Food item removed', 'success');
    }
  };

  const addWeightEntry = () => {
    if (!currentWeight) return;
    
    const newEntry = {
      id: Date.now(),
      weight: parseFloat(currentWeight),
      date: format(new Date(), 'yyyy-MM-dd'),
      timestamp: new Date().toISOString()
    };
    
    setWeightEntries(prev => [...prev, newEntry]);
    setCurrentWeight('');
    showNotification('Weight recorded!', 'success');
  };

  const resetDay = () => {
    setFoodItems([]);
    setDailyCalories(0);
    setDailyProtein(0);
    setDailyCarbs(0);
    setDailyFat(0);
    showNotification('Daily intake reset', 'success');
  };

  const exportData = async () => {
    const pdf = new jsPDF();
    const canvas = await html2canvas(document.getElementById('dashboard-content'));
    const imgData = canvas.toDataURL('image/png');
    
    pdf.addImage(imgData, 'PNG', 10, 10, 190, 270);
    pdf.save('calorie-report.pdf');
    showNotification('Report exported!', 'success');
  };

  const getWeeklyData = () => {
    const weekStart = startOfWeek(new Date());
    const weekEnd = endOfWeek(new Date());
    const days = [];
    
    for (let i = 0; i < 7; i++) {
      const date = format(subDays(weekEnd, 6 - i), 'yyyy-MM-dd');
      const dayData = historicalData[date] || { calories: 0, protein: 0, carbs: 0, fat: 0 };
      days.push({
        date: format(subDays(weekEnd, 6 - i), 'EEE'),
        ...dayData
      });
    }
    
    return days;
  };

  const progressPercentage = Math.min((dailyCalories / calorieGoal) * 100, 100);
  const proteinPercentage = Math.min((dailyProtein / proteinGoal) * 100, 100);
  const carbPercentage = Math.min((dailyCarbs / carbGoal) * 100, 100);
  const fatPercentage = Math.min((dailyFat / fatGoal) * 100, 100);

  const weeklyData = getWeeklyData();

  const chartData = {
    labels: weeklyData.map(d => d.date),
    datasets: [
      {
        label: 'Calories',
        data: weeklyData.map(d => d.calories),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4
      }
    ]
  };

  const macroData = {
    labels: ['Protein', 'Carbs', 'Fat'],
    datasets: [
      {
        data: [dailyProtein, dailyCarbs, dailyFat],
        backgroundColor: ['#ef4444', '#eab308', '#22c55e'],
        borderWidth: 0
      }
    ]
  };

  const renderBottomNav = () => (
    <div className={`fixed bottom-0 left-0 right-0 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-t`}>
      <div className="flex justify-around py-2">
        {[
          { view: 'dashboard', icon: Home, label: 'Home' },
          { view: 'analytics', icon: BarChart3, label: 'Analytics' },
          { view: 'favorites', icon: Heart, label: 'Favorites' },
          { view: 'settings', icon: Settings, label: 'Settings' }
        ].map(({ view, icon: Icon, label }) => (
          <button
            key={view}
            onClick={() => setCurrentView(view)}
            className={`flex flex-col items-center py-2 px-4 rounded-lg transition-colors ${
              currentView === view 
                ? 'text-blue-500' 
                : darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Icon size={20} />
            <span className="text-xs mt-1">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );

  const renderDashboard = () => (
    <div className={`min-h-screen pb-20 ${darkMode ? 'bg-gray-900' : 'bg-gradient-to-br from-green-50 to-blue-50'}`}>
      {notification && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-2 rounded-lg shadow-lg ${
          notification.type === 'success' ? 'bg-green-500' : 'bg-red-500'
        } text-white flex items-center gap-2`}>
          {notification.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
          {notification.message}
        </div>
      )}
      
      <div id="dashboard-content" className="container mx-auto px-4 py-6">
        <header className="flex justify-between items-center mb-6">
          <div>
            <h1 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>CalorieScan</h1>
            <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              {format(new Date(), 'EEEE, MMMM do')}
            </p>
          </div>
          <button
            onClick={() => setDarkMode(!darkMode)}
            className={`p-2 rounded-full ${darkMode ? 'bg-gray-800 text-yellow-400' : 'bg-white text-gray-600'} shadow-lg`}
          >
            {darkMode ? <Sun size={24} /> : <Moon size={24} />}
          </button>
        </header>

        {/* Calorie Progress */}
        <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-2xl shadow-lg p-6 mb-6`}>
          <div className="text-center mb-4">
            <h2 className={`text-2xl font-semibold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
              Today's Progress
            </h2>
            <div className={`text-4xl font-bold text-blue-600 mt-2`}>
              {dailyCalories} <span className={`text-lg ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>/ {calorieGoal} cal</span>
            </div>
          </div>
          
          <div className={`w-full ${darkMode ? 'bg-gray-700' : 'bg-gray-200'} rounded-full h-4 mb-4`}>
            <div 
              className="bg-gradient-to-r from-blue-500 to-green-500 h-4 rounded-full transition-all duration-500"
              style={{ width: `${progressPercentage}%` }}
            ></div>
          </div>
          
          <div className={`text-center text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            {calorieGoal - dailyCalories > 0 
              ? `${calorieGoal - dailyCalories} calories remaining`
              : 'Goal reached! 🎉'
            }
          </div>
        </div>

        {/* Macro Progress */}
        <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-2xl shadow-lg p-6 mb-6`}>
          <h3 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-800'} mb-4`}>
            Macronutrients
          </h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className={`w-full ${darkMode ? 'bg-gray-700' : 'bg-gray-200'} rounded-full h-2 mb-2`}>
                <div className="bg-red-500 h-2 rounded-full" style={{ width: `${proteinPercentage}%` }}></div>
              </div>
              <div className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                {dailyProtein}g / {proteinGoal}g
              </div>
              <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Protein</div>
            </div>
            <div className="text-center">
              <div className={`w-full ${darkMode ? 'bg-gray-700' : 'bg-gray-200'} rounded-full h-2 mb-2`}>
                <div className="bg-yellow-500 h-2 rounded-full" style={{ width: `${carbPercentage}%` }}></div>
              </div>
              <div className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                {dailyCarbs}g / {carbGoal}g
              </div>
              <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Carbs</div>
            </div>
            <div className="text-center">
              <div className={`w-full ${darkMode ? 'bg-gray-700' : 'bg-gray-200'} rounded-full h-2 mb-2`}>
                <div className="bg-green-500 h-2 rounded-full" style={{ width: `${fatPercentage}%` }}></div>
              </div>
              <div className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                {dailyFat}g / {fatGoal}g
              </div>
              <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Fat</div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <button
            onClick={() => setCurrentView('scan')}
            className="bg-gradient-to-r from-blue-500 to-blue-600 text-white py-4 px-6 rounded-xl font-semibold flex items-center justify-center gap-2 hover:from-blue-600 hover:to-blue-700 transform hover:scale-105 transition-all"
          >
            <Camera size={20} />
            Scan Barcode
          </button>
          
          <button
            onClick={() => setCurrentView('search')}
            className="bg-gradient-to-r from-green-500 to-green-600 text-white py-4 px-6 rounded-xl font-semibold flex items-center justify-center gap-2 hover:from-green-600 hover:to-green-700 transform hover:scale-105 transition-all"
          >
            <Search size={20} />
            Search Food
          </button>
        </div>

        {/* Meal Categories */}
        <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-2xl shadow-lg p-6 mb-6`}>
          <h3 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-800'} mb-4`}>
            Today's Meals
          </h3>
          
          {['breakfast', 'lunch', 'dinner', 'snacks'].map((meal) => {
            const MealIcon = mealIcons[meal];
            const mealItems = foodItems.filter(item => item.meal === meal);
            const mealCalories = mealItems.reduce((sum, item) => sum + item.calories, 0);
            
            return (
              <div key={meal} className={`border-b ${darkMode ? 'border-gray-700' : 'border-gray-100'} last:border-b-0 py-3`}>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <MealIcon size={20} className={darkMode ? 'text-gray-400' : 'text-gray-600'} />
                    <span className={`font-medium capitalize ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                      {meal}
                    </span>
                  </div>
                  <span className={`font-semibold text-blue-600`}>
                    {mealCalories} cal
                  </span>
                </div>
                {mealItems.length > 0 && (
                  <div className="mt-2 ml-8 space-y-1">
                    {mealItems.map((item) => (
                      <div key={item.id} className="flex justify-between text-sm">
                        <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
                          {item.name} ({item.serving}g)
                        </span>
                        <div className="flex items-center gap-2">
                          <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
                            {item.calories} cal
                          </span>
                          <button
                            onClick={() => removeFoodItem(item.id)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          
          {foodItems.length > 0 && (
            <div className="flex justify-center mt-4">
              <button
                onClick={resetDay}
                className="text-red-500 text-sm hover:text-red-700"
              >
                Reset Day
              </button>
            </div>
          )}
        </div>
      </div>
      
      {renderBottomNav()}
    </div>
  );

  const renderAnalytics = () => (
    <div className={`min-h-screen pb-20 ${darkMode ? 'bg-gray-900' : 'bg-gradient-to-br from-green-50 to-blue-50'}`}>
      <div className="container mx-auto px-4 py-6">
        <header className="mb-6">
          <h1 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>Analytics</h1>
          <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Your nutrition trends and insights
          </p>
        </header>

        {/* Weekly Chart */}
        <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-2xl shadow-lg p-6 mb-6`}>
          <h3 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-800'} mb-4`}>
            Weekly Calories
          </h3>
          <div className="h-64">
            <Line 
              data={chartData} 
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { display: false }
                },
                scales: {
                  y: { 
                    beginAtZero: true,
                    grid: { color: darkMode ? '#374151' : '#e5e7eb' },
                    ticks: { color: darkMode ? '#9ca3af' : '#6b7280' }
                  },
                  x: { 
                    grid: { color: darkMode ? '#374151' : '#e5e7eb' },
                    ticks: { color: darkMode ? '#9ca3af' : '#6b7280' }
                  }
                }
              }}
            />
          </div>
        </div>

        {/* Macro Distribution */}
        <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-2xl shadow-lg p-6 mb-6`}>
          <h3 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-800'} mb-4`}>
            Today's Macros
          </h3>
          <div className="h-64">
            <Doughnut 
              data={macroData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { 
                    position: 'bottom',
                    labels: { color: darkMode ? '#ffffff' : '#000000' }
                  }
                }
              }}
            />
          </div>
        </div>

        {/* Weight Tracking */}
        <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-2xl shadow-lg p-6 mb-6`}>
          <h3 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-800'} mb-4`}>
            Weight Tracking
          </h3>
          <div className="flex gap-3 mb-4">
            <input
              type="number"
              value={currentWeight}
              onChange={(e) => setCurrentWeight(e.target.value)}
              placeholder="Enter weight (kg)"
              className={`flex-1 py-2 px-3 border rounded-lg ${
                darkMode 
                  ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                  : 'border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
              }`}
            />
            <button
              onClick={addWeightEntry}
              className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
            >
              <Scale size={20} />
            </button>
          </div>
          
          {weightEntries.length > 0 && (
            <div className="space-y-2">
              <h4 className={`font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>Recent Entries</h4>
              {weightEntries.slice(-5).reverse().map((entry) => (
                <div key={entry.id} className="flex justify-between text-sm">
                  <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
                    {format(new Date(entry.timestamp), 'MMM dd, yyyy')}
                  </span>
                  <span className={`font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                    {entry.weight} kg
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Export Options */}
        <div className="flex gap-3">
          <button
            onClick={exportData}
            className="flex-1 bg-gradient-to-r from-purple-500 to-purple-600 text-white py-3 px-6 rounded-xl font-semibold flex items-center justify-center gap-2 hover:from-purple-600 hover:to-purple-700 transform hover:scale-105 transition-all"
          >
            <Download size={20} />
            Export Report
          </button>
        </div>
      </div>
      
      {renderBottomNav()}
    </div>
  );

  const renderFavorites = () => (
    <div className={`min-h-screen pb-20 ${darkMode ? 'bg-gray-900' : 'bg-gradient-to-br from-green-50 to-blue-50'}`}>
      <div className="container mx-auto px-4 py-6">
        <header className="mb-6">
          <h1 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>Favorites</h1>
          <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Your frequently added foods
          </p>
        </header>

        {favorites.length === 0 ? (
          <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-2xl shadow-lg p-8 text-center`}>
            <Heart size={48} className={`mx-auto mb-3 ${darkMode ? 'text-gray-600' : 'text-gray-300'}`} />
            <p className={darkMode ? 'text-gray-400' : 'text-gray-500'}>No favorites yet</p>
            <p className={`text-sm ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
              Add foods to favorites when adding them to your meals
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {favorites.map((favorite) => (
              <div key={favorite.id} className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg p-4`}>
                <div className="flex gap-3">
                  {favorite.image && (
                    <img 
                      src={favorite.image} 
                      alt={favorite.name}
                      className="w-16 h-16 object-cover rounded-lg"
                    />
                  )}
                  <div className="flex-1">
                    <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                      {favorite.name}
                    </h3>
                    <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      {favorite.brand}
                    </p>
                    <div className={`flex gap-4 text-xs ${darkMode ? 'text-gray-500' : 'text-gray-500'} mt-1`}>
                      <span>{favorite.calories} cal/100g</span>
                      <span>P: {favorite.protein}g</span>
                      <span>C: {favorite.carbs}g</span>
                      <span>F: {favorite.fat}g</span>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setScannedProduct(favorite);
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
        )}
      </div>
      
      {renderBottomNav()}
    </div>
  );

  const renderSettings = () => (
    <div className={`min-h-screen pb-20 ${darkMode ? 'bg-gray-900' : 'bg-gradient-to-br from-green-50 to-blue-50'}`}>
      <div className="container mx-auto px-4 py-6">
        <header className="mb-6">
          <h1 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>Settings</h1>
          <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Customize your nutrition goals
          </p>
        </header>

        {/* Daily Goals */}
        <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-2xl shadow-lg p-6 mb-6`}>
          <h3 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-800'} mb-4`}>
            Daily Goals
          </h3>
          <div className="space-y-4">
            <div>
              <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                Calories
              </label>
              <input
                type="number"
                value={calorieGoal}
                onChange={(e) => setCalorieGoal(parseInt(e.target.value) || 0)}
                className={`w-full py-2 px-3 border rounded-lg ${
                  darkMode 
                    ? 'bg-gray-700 border-gray-600 text-white' 
                    : 'border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                }`}
              />
            </div>
            <div>
              <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                Protein (g)
              </label>
              <input
                type="number"
                value={proteinGoal}
                onChange={(e) => setProteinGoal(parseInt(e.target.value) || 0)}
                className={`w-full py-2 px-3 border rounded-lg ${
                  darkMode 
                    ? 'bg-gray-700 border-gray-600 text-white' 
                    : 'border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                }`}
              />
            </div>
            <div>
              <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                Carbohydrates (g)
              </label>
              <input
                type="number"
                value={carbGoal}
                onChange={(e) => setCarbGoal(parseInt(e.target.value) || 0)}
                className={`w-full py-2 px-3 border rounded-lg ${
                  darkMode 
                    ? 'bg-gray-700 border-gray-600 text-white' 
                    : 'border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                }`}
              />
            </div>
            <div>
              <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                Fat (g)
              </label>
              <input
                type="number"
                value={fatGoal}
                onChange={(e) => setFatGoal(parseInt(e.target.value) || 0)}
                className={`w-full py-2 px-3 border rounded-lg ${
                  darkMode 
                    ? 'bg-gray-700 border-gray-600 text-white' 
                    : 'border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                }`}
              />
            </div>
          </div>
        </div>

        {/* Theme Toggle */}
        <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-2xl shadow-lg p-6 mb-6`}>
          <div className="flex justify-between items-center">
            <div>
              <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                Dark Mode
              </h3>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Switch between light and dark themes
              </p>
            </div>
            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                darkMode ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  darkMode ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      </div>
      
      {renderBottomNav()}
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
    <div className={`min-h-screen ${darkMode ? 'bg-gray-900' : 'bg-gradient-to-br from-green-50 to-blue-50'}`}>
      <div className="container mx-auto px-4 py-6">
        <header className="flex items-center gap-4 mb-6">
          <button
            onClick={() => setCurrentView('dashboard')}
            className={`p-2 rounded-full ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg`}
          >
            <X size={24} className={darkMode ? 'text-white' : 'text-black'} />
          </button>
          <h1 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>Search Food</h1>
        </header>

        <div className="max-w-md mx-auto mb-6">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && searchProducts(searchQuery)}
              placeholder="Search for food items..."
              className={`w-full py-3 px-4 pr-12 rounded-xl border ${
                darkMode 
                  ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-400' 
                  : 'border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
              }`}
            />
            <button
              onClick={() => searchProducts(searchQuery)}
              className={`absolute right-3 top-1/2 transform -translate-y-1/2 ${
                darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-blue-500'
              }`}
            >
              <Search size={20} />
            </button>
          </div>
        </div>

        {isLoading && (
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
            <p className={`mt-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Searching...</p>
          </div>
        )}

        <div className="max-w-md mx-auto space-y-3">
          {searchResults.map((product, index) => (
            <div key={index} className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg p-4`}>
              <div className="flex gap-3">
                {product.image && (
                  <img 
                    src={product.image} 
                    alt={product.name}
                    className="w-16 h-16 object-cover rounded-lg"
                  />
                )}
                <div className="flex-1">
                  <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                    {product.name}
                  </h3>
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    {product.brand}
                  </p>
                  <div className={`flex gap-4 text-xs ${darkMode ? 'text-gray-500' : 'text-gray-500'} mt-1`}>
                    <span>{product.calories} cal/100g</span>
                    <span>P: {product.protein}g</span>
                    <span>C: {product.carbs}g</span>
                    <span>F: {product.fat}g</span>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setScannedProduct(product);
                    setServing(100);
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
    const calculatedCalories = Math.round((scannedProduct.calories * serving) / 100);

    return (
      <div className={`min-h-screen ${darkMode ? 'bg-gray-900' : 'bg-gradient-to-br from-green-50 to-blue-50'}`}>
        <div className="container mx-auto px-4 py-6">
          <header className="flex items-center gap-4 mb-6">
            <button
              onClick={() => {
                setScannedProduct(null);
                setCurrentView('dashboard');
              }}
              className={`p-2 rounded-full ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg`}
            >
              <X size={24} className={darkMode ? 'text-white' : 'text-black'} />
            </button>
            <h1 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>Add Food</h1>
          </header>

          <div className="max-w-md mx-auto">
            <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-2xl shadow-lg p-6`}>
              {scannedProduct.image && (
                <img 
                  src={scannedProduct.image} 
                  alt={scannedProduct.name}
                  className="w-full h-48 object-cover rounded-lg mb-4"
                />
              )}
              
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-800'} mb-2`}>
                    {scannedProduct.name}
                  </h2>
                  <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    {scannedProduct.brand}
                  </p>
                </div>
                <button
                  onClick={() => addToFavorites(scannedProduct)}
                  className="text-red-500 hover:text-red-700"
                >
                  <Heart size={24} />
                </button>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{scannedProduct.calories}</div>
                  <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>cal/100g</div>
                </div>
                <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{calculatedCalories}</div>
                  <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>total calories</div>
                </div>
              </div>

              <div className="mb-6">
                <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                  Serving Size (grams)
                </label>
                <input
                  type="number"
                  value={serving}
                  onChange={(e) => setServing(parseInt(e.target.value) || 0)}
                  className={`w-full py-2 px-3 border rounded-lg ${
                    darkMode 
                      ? 'bg-gray-700 border-gray-600 text-white' 
                      : 'border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                  }`}
                  min="1"
                />
              </div>

              <div className="mb-6">
                <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                  Meal Category
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {['breakfast', 'lunch', 'dinner', 'snacks'].map((meal) => {
                    const MealIcon = mealIcons[meal];
                    return (
                      <button
                        key={meal}
                        onClick={() => setSelectedMeal(meal)}
                        className={`flex items-center gap-2 p-3 rounded-lg border-2 transition-colors ${
                          selectedMeal === meal
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                            : darkMode 
                              ? 'border-gray-600 bg-gray-700 hover:border-gray-500'
                              : 'border-gray-200 bg-gray-50 hover:border-gray-300'
                        }`}
                      >
                        <MealIcon size={16} />
                        <span className={`text-sm font-medium capitalize ${
                          selectedMeal === meal 
                            ? 'text-blue-600' 
                            : darkMode ? 'text-white' : 'text-gray-700'
                        }`}>
                          {meal}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className={`grid grid-cols-3 gap-2 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'} mb-6`}>
                <div className={`text-center p-2 ${darkMode ? 'bg-gray-700' : 'bg-gray-50'} rounded`}>
                  <div className={`font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                    {Math.round(scannedProduct.protein * serving / 100)}g
                  </div>
                  <div>Protein</div>
                </div>
                <div className={`text-center p-2 ${darkMode ? 'bg-gray-700' : 'bg-gray-50'} rounded`}>
                  <div className={`font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                    {Math.round(scannedProduct.carbs * serving / 100)}g
                  </div>
                  <div>Carbs</div>
                </div>
                <div className={`text-center p-2 ${darkMode ? 'bg-gray-700' : 'bg-gray-50'} rounded`}>
                  <div className={`font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                    {Math.round(scannedProduct.fat * serving / 100)}g
                  </div>
                  <div>Fat</div>
                </div>
              </div>

              <button
                onClick={() => addFoodItem(scannedProduct, serving, selectedMeal)}
                className="w-full bg-gradient-to-r from-blue-500 to-green-500 text-white py-3 px-6 rounded-xl font-semibold hover:from-blue-600 hover:to-green-600 transform hover:scale-105 transition-all"
              >
                Add to {selectedMeal.charAt(0).toUpperCase() + selectedMeal.slice(1)}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={`App ${darkMode ? 'dark' : ''}`}>
      {currentView === 'dashboard' && renderDashboard()}
      {currentView === 'scan' && renderScanner()}
      {currentView === 'search' && renderSearch()}
      {currentView === 'add' && scannedProduct && renderAddFood()}
      {currentView === 'analytics' && renderAnalytics()}
      {currentView === 'favorites' && renderFavorites()}
      {currentView === 'settings' && renderSettings()}
    </div>
  );
};

export default App;