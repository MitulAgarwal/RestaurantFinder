import React, { useState , useEffect} from 'react';
import {  Search,MapPin, Star, ExternalLink, ChevronDown, ChevronLeft, ChevronRight, ArrowRight,Clock, Menu as MenuIcon} from 'lucide-react';

// Star rating display for reviews
const StarRating = ({ rating }) => (
  <span className="flex items-center">
    {[...Array(5)].map((_, idx) => (
      <Star
        key={idx}
        className={`h-4 w-4 ${idx < rating ? 'text-yellow-400' : 'text-gray-600'}`}
        fill={idx < rating ? '#fbbf24' : 'none'}
      />
    ))}
  </span>
);

const ReviewSection = ({ reviews }) => {
  if (!reviews || reviews.length === 0)
    return <div className="text-gray-400 text-sm py-2">No reviews yet.</div>;
  return (
    <div
      className="space-y-4 pr-2"
      style={{
        maxHeight: 180,
        overflowY: 'auto'
      }}
    >
      {reviews.map((review, idx) => (
        <div key={idx} className="bg-gray-900 bg-opacity-60 rounded-lg p-3 border border-gray-700">
          <div className="flex items-center justify-between">
            <span className="font-medium text-white">{review.author_name}</span>
            <StarRating rating={review.rating} />
          </div>
          <p className="text-gray-300 mt-2 whitespace-pre-line">{review.text}</p>
          <div className="text-xs text-gray-500 mt-1">{review.time}</div>
        </div>
      ))}
    </div>
  );
};

const RestaurantCard = ({ restaurant }) => {
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [showReviews, setShowReviews] = useState(false);

  const priceDisplay = restaurant.price_level
    ? '$'.repeat(restaurant.price_level)
    : '$$';

  const cuisines = restaurant.cuisine_types || [];
  const photos = restaurant.photos && restaurant.photos.length > 0
    ? restaurant.photos
    : ['/api/placeholder/400/260'];

  const goToPrevPhoto = (e) => {
    e.stopPropagation();
    setCurrentPhotoIndex((prev) => (prev === 0 ? photos.length - 1 : prev - 1));
  };
  const goToNextPhoto = (e) => {
    e.stopPropagation();
    setCurrentPhotoIndex((prev) => (prev === photos.length - 1 ? 0 : prev + 1));
  };

  // Open/closed status
  let openNow = null;
  if (restaurant.open_now !== undefined) {
    openNow = restaurant.open_now;
  } else if (restaurant.opening_hours && typeof restaurant.opening_hours.open_now === 'boolean') {
    openNow = restaurant.opening_hours.open_now;
  }
  const openStatusDisplay = openNow === true
    ? <span className="ml-2 text-green-500 font-semibold">Open Now</span>
    : openNow === false
      ? <span className="ml-2 text-red-400 font-semibold">Closed</span>
      : null;

  return (
    <div className="bg-gray-800 rounded-xl overflow-hidden shadow-lg border border-gray-700 hover:border-gray-600 transition group">
      {/* Image slider */}
      <div className="relative h-48 overflow-hidden">
        <img
          src={photos[currentPhotoIndex]}
          alt={`${restaurant.name} - photo ${currentPhotoIndex + 1}`}
          className="w-full h-full object-cover transition duration-700 group-hover:scale-105"
          onError={(e) => { e.target.src = '/api/placeholder/400/260'; }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent opacity-70"></div>
        {photos.length > 1 && (
          <>
            <button
              onClick={goToPrevPhoto}
              className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 hover:bg-opacity-70 rounded-full p-1 text-white opacity-0 group-hover:opacity-100 transition focus:outline-none"
              aria-label="Previous photo"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={goToNextPhoto}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 hover:bg-opacity-70 rounded-full p-1 text-white opacity-0 group-hover:opacity-100 transition focus:outline-none"
              aria-label="Next photo"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
            <div className="absolute bottom-3 left-1/2 transform -translate-x-1/2 flex space-x-1">
              {photos.map((_, idx) => (
                <button
                  key={idx}
                  onClick={(e) => { e.stopPropagation(); setCurrentPhotoIndex(idx); }}
                  className={`w-2 h-2 rounded-full transition-all ${currentPhotoIndex === idx ? 'bg-white w-4' : 'bg-white bg-opacity-50 hover:bg-opacity-75'}`}
                  aria-label={`Go to photo ${idx + 1}`}
                />
              ))}
            </div>
          </>
        )}
        {/* Rating + Open/Closed badge */}
        <div className="absolute bottom-3 left-3 flex items-center space-x-2">
          <div className="bg-black bg-opacity-70 px-2 py-1 rounded-md text-xs font-medium flex items-center">
            <Star className="h-3 w-3 text-yellow-400 mr-1" />
            <span>{restaurant.rating || '4.0'}</span>
            {restaurant.total_ratings && (
              <span className="text-gray-400 ml-1">({restaurant.total_ratings})</span>
            )}
            {openStatusDisplay}
          </div>
        </div>
        {/* Price level badge */}
        <div className="absolute top-3 right-3 bg-black bg-opacity-70 px-2 py-1 rounded-md text-xs font-medium">
          {priceDisplay}
        </div>
      </div>
      {/* Content */}
      <div className="p-4">
        <h3 className="text-xl font-bold text-white mb-1 group-hover:text-orange-500 transition">
          {restaurant.name}
        </h3>
        <p className="text-gray-400 text-sm mb-3 flex items-start">
          <MapPin className="h-4 w-4 mr-1 mt-0.5 flex-shrink-0" />
          <span>{restaurant.address || restaurant.vicinity}</span>
        </p>
        {cuisines.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {cuisines.map((cuisine, idx) => (
              <span
                key={idx}
                className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded"
              >
                {cuisine}
              </span>
            ))}
          </div>
        )}
        {/* Actions */}
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-700">
          <div className="space-x-3">
            {restaurant.website && (
              <a
                href={restaurant.website}
                className="text-orange-500 hover:text-orange-400 text-sm flex items-center"
                target="_blank"
                rel="noopener noreferrer"
              >
                <span>Website</span>
                <ExternalLink className="h-3 w-3 ml-1" />
              </a>
            )}
          </div>
          {restaurant.maps_link && (
            <a
              href={restaurant.maps_link}
              className="text-sm bg-orange-600 text-white px-3 py-1 rounded-md hover:bg-orange-700 transition flex items-center"
              target="_blank"
              rel="noopener noreferrer"
            >
              <span>View Map</span>
              <ArrowRight className="h-3 w-3 ml-1" />
            </a>
          )}
        </div>
        {/* --- Reviews Section --- */}
        <div className="mt-6">
          <button
            onClick={() => setShowReviews((v) => !v)}
            className="text-sm text-orange-500 hover:text-orange-400 font-semibold mb-2"
          >
            {showReviews ? 'Hide Reviews' : 'Show Reviews'}
          </button>
          {showReviews && <ReviewSection reviews={restaurant.reviews} />}
        </div>
      </div>
    </div>
  );
};

// Main page
const GetStartedPage = () => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [location, setLocation] = useState(null);
    const [showFilters, setShowFilters] = useState(false);
    const [priceFilter, setPriceFilter] = useState([true, true, true, true]);
    const [minRating, setMinRating] = useState(0);
    const [selectedCuisines, setSelectedCuisines] = useState([]);
    const [recentSearches, setRecentSearches] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
  
    // Example cuisine options
    const cuisineOptions = [
      'Italian', 'Indian', 'Japanese', 'Mexican', 'Chinese', 
      'Thai', 'American', 'Mediterranean', 'French', 'Korean'
    ];
  
    // Example search suggestions
    const searchSuggestions = [
      'Romantic Italian dinner',
      'Cheap lunch spots nearby',
      'Vegetarian friendly cafes',
      'Family restaurants with play area',
      'Fast food open late night'
    ];
  
    useEffect(() => {
      // Load recent searches from localStorage
      const savedSearches = localStorage.getItem('recentSearches');
      if (savedSearches) {
        setRecentSearches(JSON.parse(savedSearches));
      }
      
      // Try to get user location
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            setLocation({
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            });
          },
          () => {
            console.log("Error getting location");
          }
        );
      }
    }, []);
  
    const handleSearch = async (e) => {
      e.preventDefault();
      if (!query.trim()) return;
      
      setLoading(true);
      setError('');
      
      try {
        const response = await fetch('http://localhost:8000/search', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            prompt: query,
            location: location,
            filters: {
              price: priceFilter,
              minRating: minRating,
              cuisines: selectedCuisines.length > 0 ? selectedCuisines : undefined
            }
          }),
        });
  
        if (!response.ok) throw new Error('Request failed');
        
        const data = await response.json();
        setResults(data.restaurants);
        
        // Save to recent searches
        const updatedSearches = [query, ...recentSearches.filter(s => s !== query)].slice(0, 5);
        setRecentSearches(updatedSearches);
        localStorage.setItem('recentSearches', JSON.stringify(updatedSearches));
      } catch (err) {
        setError('Failed to fetch results. Please try again.');
      } finally {
        setLoading(false);
      }
    };
  
    const handlePriceFilterToggle = (index) => {
      const newFilters = [...priceFilter];
      newFilters[index] = !newFilters[index];
      setPriceFilter(newFilters);
    };
  
    const handleCuisineToggle = (cuisine) => {
      if (selectedCuisines.includes(cuisine)) {
        setSelectedCuisines(selectedCuisines.filter(c => c !== cuisine));
      } else {
        setSelectedCuisines([...selectedCuisines, cuisine]);
      }
    };
  
    const handleSuggestionClick = (suggestion) => {
      setQuery(suggestion);
      setShowSuggestions(false);
    };
  
    // Filter visible restaurants based on current filters
    const filteredResults = results.filter(restaurant => {
      // Filter by price level if available
      if (restaurant.price_level !== undefined) {
        if (!priceFilter[restaurant.price_level - 1]) return false;
      }
      
      // Filter by rating
      if (restaurant.rating < minRating) return false;
      
      // Filter by selected cuisines if any are selected
      if (selectedCuisines.length > 0 && restaurant.cuisine_types) {
        const hasSelectedCuisine = restaurant.cuisine_types.some(cuisine => 
          selectedCuisines.includes(cuisine)
        );
        if (!hasSelectedCuisine) return false;
      }
      
      return true;
    });
  
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-gray-100">
        {/* Header */}
        <header className="sticky top-0 z-10 bg-black bg-opacity-95 backdrop-filter backdrop-blur-lg border-b border-gray-800">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <MenuIcon className="text-orange-500 h-6 w-6" />
              <h2 className="text-2xl font-bold text-orange-500">FoodQuest</h2>
            </div>
            
            {location && (
              <div className="flex items-center text-sm text-gray-400">
                <MapPin className="h-4 w-4 mr-1" />
                <span>Location detected</span>
              </div>
            )}
          </div>
        </header>
  
        <main className="container mx-auto px-4 py-12">
          {/* Hero Section */}
          <div className="text-center mb-12 pt-4">
            <h1 className="text-5xl font-extrabold mb-4 bg-gradient-to-r from-orange-500 to-red-600 bg-clip-text text-transparent">
              Let's Go on a Food Quest!
            </h1>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              Discover the perfect restaurant based on your mood, cuisine preference, and location
            </p>
          </div>
  
          {/* Search Form */}
          <div className="max-w-3xl mx-auto mb-8 relative">
            <form onSubmit={handleSearch} className="relative">
              <div className="flex gap-2 relative">
                <div className="relative flex-1 group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-gray-400" />
                  </div>
                  
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => setShowSuggestions(true)}
                    placeholder="Describe what you're looking for... (e.g. 'Romantic Italian dinner')"
                    className="w-full pl-10 pr-4 py-4 rounded-xl bg-gray-800 text-white placeholder-gray-400 border border-gray-700 focus:border-orange-500 focus:ring-2 focus:ring-orange-500 focus:ring-opacity-20 focus:outline-none transition"
                  />
                  
                  {/* Search suggestions dropdown */}
                  {showSuggestions && (query.length === 0) && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-20">
                      {recentSearches.length > 0 && (
                        <div className="p-2">
                          <h3 className="text-xs uppercase text-gray-500 font-semibold mb-1 px-2">Recent Searches</h3>
                          <div className="space-y-1">
                            {recentSearches.map((search, index) => (
                              <button
                                key={index}
                                className="w-full text-left px-3 py-2 text-gray-300 hover:bg-gray-700 rounded-md flex items-center"
                                onClick={() => handleSuggestionClick(search)}
                              >
                                <Clock className="h-3 w-3 mr-2 opacity-60" />
                                {search}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      <div className="p-2 border-t border-gray-700">
                        <h3 className="text-xs uppercase text-gray-500 font-semibold mb-1 px-2">Suggested Searches</h3>
                        <div className="space-y-1">
                          {searchSuggestions.map((suggestion, index) => (
                            <button
                              key={index}
                              className="w-full text-left px-3 py-2 text-gray-300 hover:bg-gray-700 rounded-md"
                              onClick={() => handleSuggestionClick(suggestion)}
                            >
                              {suggestion}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-gradient-to-r from-orange-600 to-red-600 text-white px-8 py-4 rounded-xl shadow hover:from-orange-700 hover:to-red-700 transition disabled:opacity-50 font-medium"
                >
                  {loading ? 'Searching...' : 'Search'}
                </button>
              </div>
            </form>
            
            {/* Filters section */}
            <div className="mt-4">
              <button 
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center text-sm text-gray-400 hover:text-white transition"
              >
                <span>Filters</span>
                <ChevronDown className={`ml-1 h-4 w-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
              </button>
              
              {showFilters && (
                <div className="mt-3 p-4 bg-gray-800 rounded-lg border border-gray-700">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Price filter */}
                    <div>
                      <h3 className="text-sm font-medium text-gray-300 mb-2">Price Range</h3>
                      <div className="flex gap-2">
                        {['$', '$$', '$$$', '$$$$'].map((price, index) => (
                          <button
                            key={index}
                            className={`px-3 py-1 rounded-md text-sm ${
                              priceFilter[index] 
                                ? 'bg-orange-600 text-white' 
                                : 'bg-gray-700 text-gray-400'
                            }`}
                            onClick={() => handlePriceFilterToggle(index)}
                          >
                            {price}
                          </button>
                        ))}
                      </div>
                    </div>
                    
                    {/* Rating filter */}
                    <div>
                      <h3 className="text-sm font-medium text-gray-300 mb-2">Minimum Rating</h3>
                      <div className="flex items-center gap-2">
                        <input
                          type="range"
                          min="0"
                          max="5"
                          step="0.5"
                          value={minRating}
                          onChange={(e) => setMinRating(parseFloat(e.target.value))}
                          className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                        />
                        <span className="text-sm font-medium flex items-center">
                          {minRating} <Star className="h-3 w-3 text-yellow-400 ml-1" />
                        </span>
                      </div>
                    </div>
                    
                    {/* Cuisine filter */}
                    <div>
                      <h3 className="text-sm font-medium text-gray-300 mb-2">Cuisine Types</h3>
                      <div className="flex flex-wrap gap-2">
                        {cuisineOptions.slice(0, 5).map((cuisine) => (
                          <button
                            key={cuisine}
                            className={`px-2 py-1 rounded-md text-xs ${
                              selectedCuisines.includes(cuisine) 
                                ? 'bg-orange-600 text-white' 
                                : 'bg-gray-700 text-gray-400'
                            }`}
                            onClick={() => handleCuisineToggle(cuisine)}
                          >
                            {cuisine}
                          </button>
                        ))}
                        <button className="px-2 py-1 rounded-md text-xs bg-gray-700 text-gray-400">
                          More...
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        
          {/* Error message */}
          {error && (
            <div className="max-w-3xl mx-auto mb-8 bg-red-900 bg-opacity-20 border border-red-800 text-red-400 p-4 rounded-lg">
              {error}
            </div>
          )}
  
          {/* Loading state */}
          {loading && (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
            </div>
          )}
  
          {/* Results */}
          {!loading && filteredResults.length > 0 && (
            <div className="max-w-5xl mx-auto">
              <h2 className="text-2xl font-bold mb-6 flex items-center">
                <span className="bg-gradient-to-r from-orange-500 to-red-600 bg-clip-text text-transparent">
                  Found {filteredResults.length} restaurants for you
                </span>
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredResults.map((restaurant, index) => (
                  <RestaurantCard key={index} restaurant={restaurant} />
                ))}
              </div>
            </div>
          )}
          
          {/* No results */}
          {!loading && results.length > 0 && filteredResults.length === 0 && (
            <div className="text-center py-12">
              <h3 className="text-xl font-medium text-gray-400 mb-2">No restaurants match your current filters</h3>
              <button 
                onClick={() => {
                  setPriceFilter([true, true, true, true]);
                  setMinRating(0);
                  setSelectedCuisines([]);
                }}
                className="text-orange-500 hover:text-orange-400"
              >
                Reset filters
              </button>
            </div>
          )}
          
          {/* Empty state */}
          {!loading && results.length === 0 && !error && (
            <div className="text-center py-12">
              <div className="max-w-md mx-auto">
                <h3 className="text-xl font-medium text-gray-300 mb-3">Ready to discover your next favorite spot?</h3>
                <p className="text-gray-400 mb-6">
                  Enter your food preferences, mood, or cuisine type to find the perfect restaurant for any occasion.
                </p>
                <div className="space-y-3">
                  {searchSuggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      className="block w-full text-left px-4 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg flex items-center justify-between group transition"
                      onClick={() => handleSuggestionClick(suggestion)}
                    >
                      <span>{suggestion}</span>
                      <ArrowRight className="h-4 w-4 text-orange-500 opacity-0 group-hover:opacity-100 transition transform group-hover:translate-x-1" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </main>
        
        {/* Footer */}
        <footer className="bg-gray-900 border-t border-gray-800 py-8 mt-16">
          <div className="container mx-auto px-4 text-center text-gray-500 text-sm">
            <p>© {new Date().getFullYear()} FoodQuest. All rights reserved.</p>
            <p className="mt-1">Find the perfect restaurants for any craving.</p>
          </div>
        </footer>
      </div>
    );
  };

export default GetStartedPage;