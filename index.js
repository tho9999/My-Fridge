import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";
import { getDatabase,
    ref,
    onValue,
    push,
    remove,
    get,
    set } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-database.js";


const firebaseConfig = {
    databaseURL: "https://inventory-d7d64-default-rtdb.firebaseio.com/"
}


const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const referenceInDB = ref(database, "locations");

const locationInput = document.getElementById("locationName")
const locationBtn = document.getElementById("addLocationBtn")
const locationList = document.getElementById("locationList")
const inventoryText = document.getElementById("inventoryText")
const itemInputName = document.getElementById("itemName")
const itemQuantity = document.getElementById("itemQuantity")
const addItemBtn = document.getElementById("addItemBtn")
const itemExpiryDate = document.getElementById("itemExpiryDate")
const inventoryItemsList = document.getElementById("inventoryItemsList")
const sortAToZBtn = document.getElementById("sortByNameAToZBtn")
const sortZToABtn = document.getElementById("sortByNameZToABtn")
const sortExpiryBtn = document.getElementById("sortByExpiryBtn")
const sortQuantityBtn = document.getElementById("sortByQuantityBtn")

// Define a class for creating location objects
class Location {
    constructor(nameLocation, quantityOfItems, items, quantityOfExpiredItems) {
        this.nameLocation = nameLocation;
        this.quantityOfItems = quantityOfItems;
        this.items = items;
        this.quantityOfExpiredItems = quantityOfExpiredItems;
    }
}

class Item {
    constructor(name, quantity, expiryDate) {
        this.name = name;
        this.quantity = quantity;
        this.expiryDate = expiryDate;
    }
}

// Initialize an empty array for locations
let locations = [];
let locationsKeys = [];
let currentLocation = null;
let currentLocationIndex = null;

function loadDatabase() {
    onValue(referenceInDB, (snapshot) => {
        const snapshotValue = snapshot.val();
        if (snapshotValue) {
            const locationsInDB = Object.values(snapshotValue);
            renderLocations(locationsInDB, snapshot);
        } else {
            console.log("No data available");
        }
    });
}

// Display the locations in the database
function renderLocations(locationsInDB, snapshot) {
    locationList.innerHTML = ""; 
    for (let i = 0; i < locationsInDB.length; i++) {
        locationsKeys[i] = Object.keys(snapshot.val())[i];
        locations[i] = locationsInDB[i];
        if (locations[i].items == null) {
            locations[i].items = [];
        }
        let newLocation = document.createElement("li");
        newLocation.innerHTML = `<div class="locationBox">
                                    <div class="locationPropertyText">
                                        <span id="locationNameText">${locationsInDB[i].nameLocation}</span>
                                        <br>Unique Items: ${locationsInDB[i].quantityOfItems} 
                                        <br>Unique Expired Items: ${locationsInDB[i].quantityOfExpiredItems}
                                    </div>
                                    <button id="removeLocationBtn">Remove</button>
                                </div>`;
        locationList.append(newLocation);
    }
}

// Load database on startup
document.addEventListener("DOMContentLoaded", () => {
    loadDatabase();
});

// Todays date
function todayDate() {
    const date = new Date();
    let day = date.getDate();
    let month = date.getMonth() + 1;
    const year = date.getFullYear();
    if (day < 10) {
        day = '0' + day;
    }
    if (month < 10) {
        month = '0' + month;
    }
    return year + "-" + month + "-" + day;
}
const today = todayDate();


// Run the checkItemsExpired function every 24 hours
setInterval(checkItemsExpired, 86400000);

// Adding Location
locationBtn.addEventListener("click", function() {
    const locationName = locationInput.value.trim();
    if (locationName === "") {
        alert("Location name can't be empty");
        return;
    }
    if (locations.some(location => location.nameLocation === locationName)) {
        alert("Location name already added");
        return;
    }
    let newLocationObject = new Location(locationName, 0, [], 0);
    push(referenceInDB, newLocationObject);
    loadDatabase();
    locationInput.value = "";
});

// Remove location from the database
function removeLocation(key) {
    const locationRef = ref(database, `locations/${key}`);
    remove(locationRef)
        .then(() => {
            console.log("Location removed successfully");
    })
    .catch((error) => {
        console.error("Error removing location: ", error);
    });
}

// If click on a location, display the inventory of that location
locationList.addEventListener('click', function(event) {
    const closestLocation = event.target.closest("LI");
    if (closestLocation && event.target.id != "removeLocationBtn") {
        const locationName = closestLocation.querySelector("#locationNameText").textContent;
        inventoryText.innerHTML = `My Inventory: ${locationName}`;
        currentLocation = findLocationObject(locationName);
        displayInventory(currentLocation);
    } else if (event.target.id === "removeLocationBtn"){
        const locationName = closestLocation.querySelector("#locationNameText").textContent;
        for (let i = 0; i < locations.length; i++){
            if(locationName == locations[i].nameLocation){
                locations.splice(i, 1);
                locationList.removeChild(closestLocation);
                removeLocation(locationsKeys[i]);   
                currentLocation = null;
                inventoryText.innerHTML = "My Inventory";
                inventoryItemsList.innerHTML = "";
            }
        }
    }
});

// Helper function to find the location object
function findLocationObject(locationName) {
    for (let i = 0; i < locations.length; i++) {
        if (locationName === locations[i].nameLocation) {
            currentLocationIndex = i;
            return locations[i];
        }
    }
    return null;
}

// Helper function to display the inventory of a location
function displayInventory(location) {
    inventoryText.innerHTML = `My Inventory: ${location.nameLocation}`;
    inventoryItemsList.innerHTML = "";
    if (location.items == null) {
        return;
    }
    const itemKeys = Object.keys(location.items);
    for (let i = 0; i < itemKeys.length; i++) {
        const itemID = itemKeys[i];
        const item = location.items[itemID];
        displayItemBox(item.name, item.quantity, item.expiryDate);
    }
}

// Function to add an item to a specific location
function addItemToLocation(locationId, itemName, itemQuantity, itemExpiryDate) {
    const locationRef = ref(database, `locations/${locationId}/items`);
    const newItem = {
        name: itemName,
        quantity: itemQuantity,
        expiryDate: itemExpiryDate
    };
    push(locationRef, newItem).then(() => {
        console.log("Item added successfully");
    }).catch((error) => {
        console.error("Error adding item: ", error);
    });
}

// Adding Item to current location's inventory
addItemBtn.addEventListener("click", function(){
    if (currentLocation == null) {
        alert("Please click on a location");
        return;
    }
    const itemName = itemInputName.value.trim()
    const itemQuantityValue = itemQuantity.value
    if (itemName == "" || itemQuantityValue == ""){
        alert("Item name or quantity can't be empty")
        return
    }
    if (!Array.isArray(currentLocation.items)) {
        currentLocation.items = [];
    }
    let locationRef = ref(database, `locations/${locationsKeys[currentLocationIndex]}`);
    get(locationRef).then((snapshot) => {
        if (snapshot.exists()) {
            const currentLocationObject = snapshot.val();
            if(currentLocationObject.items == null){
                currentLocationObject.items = [];
            }
            const itemKeys = Object.keys(currentLocationObject.items);
            for(let i = 0; i < currentLocationObject.quantityOfItems; i++){
                console.log(currentLocationObject.items[itemKeys[i]].name)
                console.log(itemName)
                if(itemName == currentLocationObject.items[itemKeys[i]].name){
                    alert("Item already exists in the inventory");
                    return;
                }
            }
        
            let newItemObject = new Item(itemName, itemQuantity.value, itemExpiryDate.value);
            addItemToLocation(locationsKeys[currentLocationIndex], itemName, itemQuantity.value, itemExpiryDate.value);
            currentLocation.items.push(newItemObject);
            currentLocation.quantityOfItems++;
            locationRef = ref(database, `locations/${locationsKeys[currentLocationIndex]}/quantityOfItems`);
            set(locationRef, currentLocation.quantityOfItems);
            if(checkItemExpired(newItemObject)){
                const locationRef = ref(database, `locations/${locationsKeys[currentLocationIndex]}/quantityOfExpiredItems`);
                set(locationRef, currentLocation.quantityOfExpiredItems + 1);
            }
            updateLocationStats();
            itemInputName.value = "";
            const locationName = currentLocation.nameLocation;
            inventoryText.innerHTML = `My Inventory: ${locationName}`;
            currentLocation = findLocationObject(locationName);
            displayInventory(currentLocation);
        
        } else {
            console.log("No data available at this location.");
        }
    }).catch((error) => {
        console.error("Error getting location object:", error);
    });
})


// Helper function to display each item of the location
function displayItemBox(itemName, itemQuantityValue, itemExpiryDate) {
    if (checkItemExpired(new Item(itemName, itemQuantityValue, itemExpiryDate))) {
        let newItem = document.createElement("li");
        inventoryItemsList.append(newItem);
        newItem.innerHTML = `<div class="expiredItemBox">
                                <div class="itemPropertyText">
                                    <span class="itemNameText">${itemName}</span>
                                    <br>Quantity: ${itemQuantityValue} <button class="increaseQuantityByOneBtn">+1</button><button class="reduceQuantityByOneBtn">-1</button>
                                    <br>Expiry Date: ${itemExpiryDate}
                                </div>
                                <button class="removeItemBtn">Remove</button>
                            </div>`;    
    }else{
        let newItem = document.createElement("li");
        inventoryItemsList.append(newItem);
        newItem.innerHTML = `<div class="itemBox">
                                <div class="itemPropertyText">
                                    <span class="itemNameText">${itemName}</span>
                                    <br>Quantity: ${itemQuantityValue} <button class="increaseQuantityByOneBtn">+1</button><button class="reduceQuantityByOneBtn">-1</button>
                                    <br>Expiry Date: ${itemExpiryDate}
                                </div>
                                <button class="removeItemBtn">Remove</button>
                            </div>`;    
    }
}


// Add and remove quantity of an item
inventoryItemsList.addEventListener('click', function(event) {
    if (event.target.textContent === '+1') {
        const itemName = event.target.parentElement.querySelector(".itemNameText").textContent;
        const itemKeys = Object.keys(currentLocation.items);
        for (let i = 0; i < itemKeys.length; i++) {
            console.log("itemKeys: " + itemKeys);
            const itemID = itemKeys[i];
            if(itemID < "0" || itemID > "10000"){
                const item = currentLocation.items[itemID];
                if(item.name === itemName){
                    console.log("itemID: " + itemID);
                    const itemRef = ref(database, `locations/${locationsKeys[currentLocationIndex]}/items/${itemID}/quantity`);
                    const newQuantity = +item.quantity + 1;
                    set(itemRef, newQuantity);
                    currentLocation.items[itemID].quantity++
                    displayInventory(currentLocation);
                    break;
                }
            }
        }
    } else if (event.target.textContent === '-1') {
        const itemName = event.target.parentElement.querySelector(".itemNameText").textContent;
        const itemKeys = Object.keys(currentLocation.items);
        for (let i = 0; i < itemKeys.length; i++) {
            console.log("itemKeys: " + itemKeys);
            const itemID = itemKeys[i];
            if(itemID < "0" || itemID > "10000"){
                const item = currentLocation.items[itemID];
                if(item.name === itemName){
                    console.log("itemID: " + itemID);
                    const itemRef = ref(database, `locations/${locationsKeys[currentLocationIndex]}/items/${itemID}/quantity`);
                    const newQuantity = +item.quantity - 1;
                    set(itemRef, newQuantity);
                    currentLocation.items[itemID].quantity--
                    displayInventory(currentLocation);
                    break;
                }
            }
        }
    }
});

//Remove item from inventory
inventoryItemsList.addEventListener('click', function(event) {
    if (event.target.textContent === 'Remove') {
        const itemName = event.target.parentElement.querySelector(".itemNameText").textContent;
        const itemKeys = Object.keys(currentLocation.items);
        for (let i = 0; i < itemKeys.length; i++) {
            const itemID = itemKeys[i];
            if(itemID < "0" || itemID > "10000"){
                const item = currentLocation.items[itemID];
                if(item.name === itemName){
                    if(checkItemExpired(item)){
                        const locationRef = ref(database, `locations/${locationsKeys[currentLocationIndex]}/quantityOfExpiredItems`);
                        set(locationRef, currentLocation.quantityOfExpiredItems - 1);
                    }
                    const itemRef = ref(database, `locations/${locationsKeys[currentLocationIndex]}/items/${itemID}`);
                    remove(itemRef)
                    .then(() => {
                        const locationRef = ref(database, `locations/${locationsKeys[currentLocationIndex]}/quantityOfItems`);
                        set(locationRef, currentLocation.quantityOfItems - 1);
                        delete currentLocation.items[itemID];
                        currentLocation.quantityOfItems--;
                        displayInventory(currentLocation);
                    })
                    .catch((error) => {
                        console.error("Error removing location: ", error);
                    });
                }
            }
        }
    }
});

// Helper function to update stats of the location
// Going to need to update for expired items, and quantity of items (add and remove button)
function updateLocationStats(){
    locationList.innerHTML = "";
    for (let i = 0; i < locations.length; i ++) {
        let location = locations[i];
        let newLocation = document.createElement("li");
        newLocation.innerHTML = `<div class="locationBox">
                                    <div class="locationPropertyText">
                                        <span id="locationNameText">${location.nameLocation}</span>
                                        <br>Unique Items: ${location.quantityOfItems} 
                                        <br>Unique Expired Items: ${location.quantityOfExpiredItems}
                                    </div>
                                    <button id="removeLocationBtn">Remove</button>
                                </div>`;
        locationList.append(newLocation);
    }
}

// Helper functin to check if items are expired
function checkItemsExpired(){
    for (let i = 0; i < locations.length; i++) {
        let location = locations[i];
        if (location.items.length === 0) {
            return
        }
        let itemsInLocation = location.items.length;
        location.quantityOfExpiredItems = 0;
        for (let j = 0; j < itemsInLocation; j++) {
            let item = location.items[j];
            if (item.expirationDate < today) {
                location.quantityOfExpiredItems++;
            }
        }
    }
}

// Check if singular item is expired
function checkItemExpired(item){
    if (item.expiryDate < today) {
        return true;
    }
    return false;
}

// Sorting
// Sort items by name A-Z
sortAToZBtn.addEventListener("click", function(){
    const itemKeys = Object.keys(currentLocation.items);
    for (let i = 0; i < currentLocation.quantityOfItems; i++) {
        let lowestItem = currentLocation.items[itemKeys[i]];
        let lowestIndex = itemKeys[i];
        for (let j = i+1; j < currentLocation.quantityOfItems; j++) {
            if (currentLocation.items[itemKeys[j]].name < lowestItem.name) {
                lowestItem = currentLocation.items[itemKeys[j]];
                lowestIndex = itemKeys[j];
            }
        }
        let temp = currentLocation.items[itemKeys[i]];
        currentLocation.items[itemKeys[i]] = lowestItem;
        currentLocation.items[lowestIndex] = temp;
        displayInventory(currentLocation);
    }
})

// Sort items by name Z-A
sortZToABtn.addEventListener("click", function(){
    const itemKeys = Object.keys(currentLocation.items);
    for (let i = 0; i < currentLocation.quantityOfItems; i++) {
        let lowestItem = currentLocation.items[itemKeys[i]];
        let lowestIndex = itemKeys[i];
        for (let j = i+1; j < currentLocation.quantityOfItems; j++) {
            if (currentLocation.items[itemKeys[j]].name > lowestItem.name) {
                lowestItem = currentLocation.items[itemKeys[j]];
                lowestIndex = itemKeys[j];
            }
        }
        let temp = currentLocation.items[itemKeys[i]];
        currentLocation.items[itemKeys[i]] = lowestItem;
        currentLocation.items[lowestIndex] = temp;
        displayInventory(currentLocation);
    }
})

// Sort items by closest expiry date
sortExpiryBtn.addEventListener("click", function(){
    const itemKeys = Object.keys(currentLocation.items);
    for (let i = 0; i < currentLocation.quantityOfItems; i++) {
        let lowestItem = currentLocation.items[itemKeys[i]];
        let lowestIndex = itemKeys[i];
        for (let j = i+1; j < currentLocation.quantityOfItems; j++) {
            if (currentLocation.items[itemKeys[j]].expiryDate < lowestItem.expiryDate) {
                lowestItem = currentLocation.items[itemKeys[j]];
                lowestIndex = itemKeys[j];
            }
        }
        let temp = currentLocation.items[itemKeys[i]];
        currentLocation.items[itemKeys[i]] = lowestItem;
        currentLocation.items[lowestIndex] = temp;
        displayInventory(currentLocation);
    }
})

// Sort items by quantity
sortQuantityBtn.addEventListener("click", function(){
    const itemKeys = Object.keys(currentLocation.items);
    for (let i = 0; i < currentLocation.quantityOfItems; i++) {
        let lowestItem = currentLocation.items[itemKeys[i]];
        let lowestIndex = itemKeys[i];
        for (let j = i+1; j < currentLocation.quantityOfItems; j++) {
            if (currentLocation.items[itemKeys[j]].quantity > lowestItem.quantity) {
                lowestItem = currentLocation.items[itemKeys[j]];
                lowestIndex = itemKeys[j];
            }
        }
        let temp = currentLocation.items[itemKeys[i]];
        currentLocation.items[itemKeys[i]] = lowestItem;
        currentLocation.items[lowestIndex] = temp;
        displayInventory(currentLocation);
    }
})

//Features to add:
// DONE 1. Add a option to change the qunaity of an item
// DONE 1. Add a button to remove an item from the inventory
// DONE 2. Update the quantity of items in the location when adding an item
// DONE 3. Update the quantity of expired items in the location when adding an item
// DONE 4. Add a button to remove a location
// DONE 5. Sort items by expiration date
// DONE 6. Sort items by name
// DONE 7. Sort items by quantity
// DONE 10. Stle the page with CSS
//          - +1 and -1 buttons
//          - Remove buttons
//          - Sort button text
//          - Add buttons
// DONE 11. If expired highlight item in red
// 11. Database (firebase) to store the locations and items
//      DONE - add location
//      DONE - display loaded location
//      DONE - display locations inventory
//      DONE - add item to location
//      DONE - display given item
//      DONE - remove item from location
//      DONE - remove location
//      DONE - increase and decrease quantity
//      DONE - sort items
//      DONE - check for expired items
//      DONE - update quantity of expired items
// 8. Update daily the quantity of expired items in the location
// 9. Notify the user when an item is expired
// 12. Make easy mobile friendly

//Problems
// DONE 1. When adding items location changes
// DONE 2. epired items arent counting properly
// DONE 3. Remove location doesnt work
// DONE 4. Counting a expired item doesnt work
// DONE 5. Removing expired items doensnt update the quantity of expired items in location
// Can add same location name
// 6. Check Expiry doesnt actually work every 24hrs
// DONE 7. name duplicate check doesnt work