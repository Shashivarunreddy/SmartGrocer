const fs = require('fs');
const path = require('path');

const PRODUCTS_JSON_PATH = path.resolve(__dirname, '../../products.json');
const data = JSON.parse(fs.readFileSync(PRODUCTS_JSON_PATH, 'utf-8'));

/**
 * Verified UK Supermarket Pricing Map (in GBP / £)
 * Sources: Sainsbury's (sainsburys.co.uk), M&S / Ocado (ocado.com), Tesco, Waitrose
 */
const UK_PRICING_MAP = {
  // 1 to 20
  '00088862': { price: 0.45, qty: 500, unit: 'g', quantity: '500g' }, // Sainsbury's Plain Flour 500g
  '00088886': { price: 0.85, qty: 500, unit: 'g', quantity: '500g' }, // M&S Self Raising Flour 500g
  '00113991': { price: 1.75, qty: 1, unit: 'l', quantity: '1L' }, // Sainsbury's Apple Watermelon Raspberry Juice 1L
  '00114356': { price: 1.30, qty: 390, unit: 'g', quantity: '390g' }, // by Sainsbury's Ratatouille 390g
  '00114936': { price: 0.85, qty: 1, unit: 'l', quantity: '1L' }, // Sainsbury's Indian Tonic Water 1L
  '00115830': { price: 1.50, qty: 200, unit: 'g', quantity: '200g' }, // Simply M&S Extra Light Soft Cheese 200g
  '00116022': { price: 1.65, qty: 500, unit: 'ml', quantity: '500ml' }, // Sainsbury's Kefir Milk Drink 500ml
  '00116329': { price: 3.75, qty: 300, unit: 'g', quantity: '300g' }, // M&S Chicken Breast Fillets 300g
  '00116343': { price: 2.50, qty: 100, unit: 'g', quantity: '100g' }, // M&S Collection Christmas Pudding 100g
  '00116350': { price: 4.50, qty: 454, unit: 'g', quantity: '454g' }, // M&S Perfectly Matured Christmas Pudding 454g
  '00116367': { price: 7.50, qty: 907, unit: 'g', quantity: '907g' }, // M&S Intensely Fruity Christmas Pudding 907g
  '00116831': { price: 1.75, qty: 4, unit: 'piece', quantity: '4 pack' }, // M&S Super Seeded Deli Rolls 4s
  '00116954': { price: 1.50, qty: 100, unit: 'g', quantity: '100g' }, // Sainsbury's Swiss Dark Chocolate 100g
  '00116961': { price: 1.80, qty: 100, unit: 'g', quantity: '100g' }, // Sainsbury's TTD Swiss White Chocolate 100g
  '00117746': { price: 2.25, qty: 225, unit: 'g', quantity: '225g' }, // M&S Reduced Fat Belgian Choc Chunk Cookies 225g
  '00117975': { price: 1.70, qty: 600, unit: 'g', quantity: '4 pack (600g)' }, // Sainsbury's Conference Pears 600g
  '00117982': { price: 0.85, qty: 500, unit: 'g', quantity: '1 head (500g)' }, // M&S Red Cabbage 500g
  '00118286': { price: 2.50, qty: 300, unit: 'g', quantity: '6 rashers (300g)' }, // Sainsbury's 6 Thick Cut Bacon Rashers
  '00118361': { price: 0.90, qty: 30, unit: 'g', quantity: '30g' }, // M&S Cheese Tasters 30g
  '00119740': { price: 1.80, qty: 100, unit: 'g', quantity: '100g' }, // Sainsbury's TTD Fairtrade White Chocolate 100g

  // 21 to 40
  '00120241': { price: 3.25, qty: 400, unit: 'g', quantity: '400g' }, // M&S All Butter Shortbread Cookies 400g
  '00120425': { price: 3.25, qty: 240, unit: 'g', quantity: '240g' }, // Sainsbury's Applewood Smoked Bacon 240g
  '00120623': { price: 1.20, qty: 40, unit: 'g', quantity: '40g' }, // M&S Sweet Potato Parsnip Beetroot Crisps 40g
  '00120715': { price: 0.95, qty: 250, unit: 'g', quantity: '250g' }, // Sainsbury's Spicy Mexican Style Rice 250g
  '00120920': { price: 1.35, qty: 500, unit: 'g', quantity: '500g' }, // Sainsbury's Brown Rice 500g
  '00120999': { price: 1.85, qty: 500, unit: 'g', quantity: '500g' }, // Sainsbury's Thai Sticky Rice 500g
  '00121019': { price: 2.25, qty: 120, unit: 'g', quantity: '120g' }, // Sainsbury's British Ham Slices 120g
  '00121358': { price: 1.20, qty: 1.13, unit: 'l', quantity: '2 pints (1.13L)' }, // Sainsbury's Whole British Milk 2 pints
  '00121903': { price: 2.50, qty: 135, unit: 'g', quantity: '135g' }, // M&S Extremely Chocolatey Caramels 135g
  '00122580': { price: 2.10, qty: 325, unit: 'g', quantity: '9 pack (325g)' }, // M&S Luxury Fruited Mini Hot Cross Buns
  '00124386': { price: 2.60, qty: 125, unit: 'g', quantity: '125g' }, // Sainsbury's TTD Citrus Grey Fairtrade Tea 125g
  '00129855': { price: 11.50, qty: 350, unit: 'ml', quantity: '35 cL' }, // Sainsbury's TTD Kirsch 35cL
  '00130257': { price: 3.25, qty: 340, unit: 'g', quantity: '340g' }, // Sainsbury's TTD Orange Blossom Honey 340g
  '00130912': { price: 1.85, qty: 150, unit: 'g', quantity: '150g' }, // M&S Crispy Cheese Crackers 150g
  '00131391': { price: 1.75, qty: 190, unit: 'g', quantity: '190g' }, // M&S Red Pesto 190g
  '00132282': { price: 4.50, qty: 100, unit: 'g', quantity: '100g' }, // M&S Scottish Oak Smoked Salmon 100g
  '00132589': { price: 1.90, qty: 170, unit: 'g', quantity: '170g' }, // M&S Percy Pig Soft Fruit Gums 170g
  '00132619': { price: 1.35, qty: 64, unit: 'g', quantity: '64g' }, // M&S Food Poppadoms 64g
  '00132862': { price: 2.25, qty: 150, unit: 'g', quantity: '150g' }, // M&S Fresh Raspberries 150g
  '00133265': { price: 1.25, qty: 50, unit: 'g', quantity: '50g' }, // M&S Poppadums 50g

  // 41 to 60
  '00133418': { price: 1.45, qty: 400, unit: 'g', quantity: '400g' }, // M&S Food White Bloomer 400g
  '00133647': { price: 2.75, qty: 130, unit: 'g', quantity: '130g' }, // Sainsbury's TTD Mortadella 130g
  '00135085': { price: 1.85, qty: 100, unit: 'g', quantity: '100g' }, // M&S Purely Pomegranate 100g
  '00137966': { price: 2.10, qty: 130, unit: 'g', quantity: '130g' }, // M&S Charcoal Biscuits 130g
  '00138178': { price: 1.85, qty: 100, unit: 'g', quantity: '100g' }, // M&S Parmesan & Spring Onion Bakes 100g
  '00138352': { price: 1.95, qty: 150, unit: 'g', quantity: '150g' }, // M&S Cheese & Multiseed Crackers 150g
  '00138550': { price: 1.85, qty: 100, unit: 'g', quantity: '100g' }, // M&S Sundried Tomato & Olive Tapenade Bakes 100g
  '00139892': { price: 1.40, qty: 85, unit: 'g', quantity: '85g' }, // M&S Sea Salt & Black Pepper Croutons 85g
  '00140164': { price: 1.40, qty: 800, unit: 'g', quantity: '800g' }, // M&S Super Soft Thick Wholemeal Loaf 800g
  '00140478': { price: 2.20, qty: 392, unit: 'g', quantity: '2 pack (392g)' }, // M&S Ripe Hass Avocados Twin Pack
  '00140591': { price: 2.50, qty: 170, unit: 'g', quantity: '9 pack (170g)' }, // M&S 9 Mini All Butter Mince Pies 170g
  '00140980': { price: 3.25, qty: 180, unit: 'g', quantity: '180g' }, // M&S Smoked Ham & Mustard Sandwich 180g
  '00143707': { price: 2.25, qty: 135, unit: 'g', quantity: '135g' }, // M&S Cornish Clotted Cream Crumbly Fudge 135g
  '00144353': { price: 0.85, qty: 450, unit: 'g', quantity: '450g' }, // Sainsbury's Basics Brown Sauce 450g
  '00145206': { price: 1.75, qty: 200, unit: 'ml', quantity: '200ml' }, // M&S Caesar Dressing 200ml
  '00145954': { price: 1.45, qty: 200, unit: 'g', quantity: '200g' }, // M&S Classic Houmous 200g
  '00146883': { price: 4.25, qty: 350, unit: 'g', quantity: '350g' }, // M&S Roasted Nut Selection 350g
  '00148214': { price: 1.60, qty: 1, unit: 'l', quantity: '1L' }, // M&S Unsweetened Almond Milk 1L
  '00148498': { price: 4.50, qty: 480, unit: 'g', quantity: '480g' }, // M&S Aberdeen Angus Steak Pie 480g
  '00151917': { price: 1.95, qty: 500, unit: 'g', quantity: '500g' }, // M&S Madagascan Vanilla Custard 500g

  // 61 to 80
  '00152549': { price: 2.60, qty: 120, unit: 'g', quantity: '120g' }, // M&S Wiltshire Cured Breaded Ham 120g
  '00154222': { price: 3.50, qty: 400, unit: 'g', quantity: '400g' }, // M&S Food Three Cheese Ravioli 400g
  '00154352': { price: 1.75, qty: 235, unit: 'ml', quantity: '235ml' }, // M&S Honey & Mustard Dressing 235ml
  '00154741': { price: 4.00, qty: 130, unit: 'g', quantity: '130g' }, // M&S Garlic Chilli Paprika King Prawns 130g
  '00156707': { price: 2.00, qty: 200, unit: 'g', quantity: '200g' }, // M&S Milk Chocolate Shortcake Biscuits 200g
  '00156738': { price: 2.25, qty: 230, unit: 'g', quantity: '230g' }, // M&S Milk Chocolate Orange Biscuits 230g
  '00156929': { price: 2.25, qty: 175, unit: 'g', quantity: '175g' }, // M&S Extremely Chocolatey Ginger Biscuits 175g
  '00156936': { price: 2.50, qty: 200, unit: 'g', quantity: '200g' }, // M&S Outrageously Chocolatey Dark Rounds 200g
  '00158039': { price: 1.50, qty: 150, unit: 'g', quantity: '150g' }, // M&S Assorted Fruit Sherbets 150g
  '00159388': { price: 1.25, qty: 250, unit: 'ml', quantity: '250ml' }, // Sainsbury's Coconut Cream 250ml
  '00159944': { price: 1.20, qty: 500, unit: 'g', quantity: '500g' }, // M&S Chef's Style Carrots 500g
  '00160919': { price: 5.00, qty: 400, unit: 'g', quantity: '400g' }, // M&S Food Lamb Rogan Josh 400g
  '00162265': { price: 3.90, qty: 400, unit: 'g', quantity: '400g' }, // Sainsbury's British Turkey Breast Fillets 400g
  '00162838': { price: 1.50, qty: 800, unit: 'g', quantity: '800g' }, // M&S Oaty Farmhouse Loaf 800g
  '00167048': { price: 2.50, qty: 150, unit: 'g', quantity: '150g' }, // M&S Eat Well Natural Almonds 150g
  '00169752': { price: 2.00, qty: 250, unit: 'g', quantity: '250g' }, // M&S Collection Piccolini Vine Tomatoes 250g
  '00172899': { price: 0.95, qty: 2, unit: 'l', quantity: '2L' }, // M&S Diet Cola 2L
  '00174930': { price: 1.65, qty: 300, unit: 'g', quantity: '4 pack (300g)' }, // M&S Eat Well Oatmeal Deli Rolls 4s
  '00175579': { price: 2.75, qty: 300, unit: 'g', quantity: '4 pack (300g)' }, // M&S Food British Pork Pies 4 pack
  '00178396': { price: 4.50, qty: 500, unit: 'ml', quantity: '500ml' }, // Sainsbury's Extra Virgin Olive Oil 500ml
  '00179195': { price: 3.80, qty: 227, unit: 'g', quantity: '227g' }, // Sainsbury's Organic Ground Coffee 227g

  // 81 to 105
  '00185677': { price: 2.00, qty: 200, unit: 'g', quantity: '200g' }, // M&S Roasted Vegetable Couscous 200g
  '00187053': { price: 1.50, qty: 55, unit: 'g', quantity: '55g' }, // M&S Outdoor Bred Smoky Bacon Strips 55g
  '00187640': { price: 2.00, qty: 110, unit: 'g', quantity: '110g' }, // M&S Extra Fine Asparagus 110g
  '00188029': { price: 1.65, qty: 1, unit: 'l', quantity: '1L' }, // by Sainsbury's Clementine Juice 1L
  '00188586': { price: 1.40, qty: 300, unit: 'ml', quantity: '300ml' }, // M&S Creme Fraiche 300ml
  '00191128': { price: 1.10, qty: 300, unit: 'g', quantity: '300g' }, // M&S Rich Tea Biscuits Reduced Fat 300g
  '00193696': { price: 3.25, qty: 200, unit: 'g', quantity: '200g' }, // M&S Egg & Avocado Salad Pot 200g
  '00195157': { price: 2.25, qty: 335, unit: 'g', quantity: '4 pack (335g)' }, // M&S 4 Stonebaked Flatbreads Garlic Butter
  '00206907': { price: 1.25, qty: 100, unit: 'g', quantity: '100g' }, // by Sainsbury's Fresh Blueberries 100g
  '00213158': { price: 4.00, qty: 390, unit: 'g', quantity: '390g' }, // Count on Us Lemon Ginger Chicken Curry 390g
  '00239219': { price: 1.60, qty: 400, unit: 'g', quantity: '400g' }, // M&S Multi Seed Bloomer Slices 400g
  '00247245': { price: 1.20, qty: 216, unit: 'g', quantity: '6 pack (216g)' }, // M&S Mini White Pittas 6 pack
  '00251259': { price: 0.90, qty: 25, unit: 'g', quantity: '25g' }, // Cook with M&S Fresh Basil 25g
  '00252812': { price: 3.00, qty: 260, unit: 'g', quantity: '2 pack (260g)' }, // M&S Vegetable Kievs 260g
  '00253451': { price: 2.75, qty: 500, unit: 'g', quantity: '500g' }, // Sainsbury's Dark Choc Hazelnut Crisp Cereal 500g
  '00256810': { price: 2.20, qty: 1, unit: 'l', quantity: '1L' }, // M&S Pure Squeezed Orange Juice 1L
  '00257329': { price: 4.75, qty: 100, unit: 'g', quantity: '100g' }, // M&S Collection Mild Smoked Salmon 100g
  '00263931': { price: 1.50, qty: 275, unit: 'g', quantity: '275g' }, // M&S Eat Well Rice Noodles 275g
  '00264495': { price: 4.50, qty: 330, unit: 'g', quantity: '18 pack (330g)' }, // M&S Collection Medjool Dates 330g
  '00266710': { price: 3.20, qty: 300, unit: 'g', quantity: '300g' }, // M&S Wensleydale Cheese 300g
  '00285087': { price: 2.25, qty: 1, unit: 'l', quantity: '1L' }, // M&S Pressed Berry Medley Juice 1L
  '00285124': { price: 2.50, qty: 37.5, unit: 'g', quantity: '15 pyramids (37.5g)' }, // M&S Green Sencha Tea Pyramids
  '00289719': { price: 2.50, qty: 170, unit: 'g', quantity: '170g' }, // By Sainsbury's Smooth Almond Butter 170g
  '00291538': { price: 1.80, qty: 60, unit: 'piece', quantity: '60 tablets' }, // Asda Vitamin D Tablets 60s

  // 106 to 122 (Walkers Shortbread & Biscuits)
  '0039047001138': { price: 2.25, qty: 160, unit: 'g', quantity: '160g' }, // Walkers Pure Butter Shortbread 160g
  '0039047001169': { price: 0.80, qty: 40, unit: 'g', quantity: '40g' }, // Walkers Shortbread Fingers 40g
  '0039047001466': { price: 0.70, qty: 28, unit: 'g', quantity: '28g' }, // Walkers Shortbread Fingers All-Butter 28g
  '0039047001886': { price: 3.20, qty: 250, unit: 'g', quantity: '250g' }, // Walkers Pure Butter Assorted Shortbread 250g
  '0039047004931': { price: 3.50, qty: 250, unit: 'g', quantity: '250g' }, // Walkers Chocolate Shortbread Assortment 250g
  '0039047005440': { price: 2.20, qty: 150, unit: 'g', quantity: '150g' }, // Walkers Choc Chunk & Hazelnut Biscuits 150g
  '0039047010215': { price: 2.00, qty: 140, unit: 'g', quantity: '140g' }, // Walkers Chocolate Chip Cookies 140g
  '0039047011007': { price: 0.60, qty: 20, unit: 'g', quantity: '20g' }, // Walkers Pure Butter Shortbread Mini 20g
  '0039047011496': { price: 1.95, qty: 125, unit: 'g', quantity: '125g' }, // Walkers Pure Butter Shortbread 125g
  '0039047012318': { price: 2.35, qty: 160, unit: 'g', quantity: '160g' }, // Walkers Assorted Shortbread Cookies 160g
  '0039047013087': { price: 4.25, qty: 320, unit: 'g', quantity: '320g' }, // Walkers Shortbread Assortment Tin 320g
  '0039047013094': { price: 4.25, qty: 320, unit: 'g', quantity: '320g' }, // Walkers Assorted Shortbread 320g
  '0039047013551': { price: 2.75, qty: 190, unit: 'g', quantity: '190g' }, // Walkers Organic Shortbread Fingers 190g
  '0039047014183': { price: 2.50, qty: 175, unit: 'g', quantity: '175g' }, // Walkers Pure Butter Shortbread 175g
  '0039047015265': { price: 2.75, qty: 200, unit: 'g', quantity: '200g' }, // Walkers Shortbread 200g
  '0039047015760': { price: 2.25, qty: 150, unit: 'g', quantity: '150g' }, // Walkers Christmas Tree Mini Cookies 150g
  '0039047050075': { price: 0.75, qty: 25, unit: 'g', quantity: '25g' }, // Walker's Crumbly Fruit & Lemon Biscuits 25g

  // 123 to 131
  '00303705': { price: 1.25, qty: 300, unit: 'g', quantity: '300g' }, // Simply M&S Traditional Oatcakes 300g
  '00306089': { price: 5.00, qty: 300, unit: 'g', quantity: '300g' }, // M&S Disco Glitter Ball Novelty 300g
  '00308519': { price: 0.90, qty: 110, unit: 'g', quantity: '110g' }, // Sainsbury's Roasted Vegetable Couscous 110g
  '00312912': { price: 0.90, qty: 25, unit: 'g', quantity: '25g' }, // Cook with M&S Fresh Dill 25g
  '00342872': { price: 3.50, qty: 580, unit: 'g', quantity: '4 x 145g' }, // by Sainsbury's Tuna Steak in Spring Water
  '00348843': { price: 1.55, qty: 2, unit: 'l', quantity: '2L' }, // Kingsmill English Semi-Skimmed Milk 2L
  '00356398': { price: 2.20, qty: 1, unit: 'l', quantity: '1L' }, // M&S Pressed Apple & Mango Juice 1L
  '00392990': { price: 1.85, qty: 300, unit: 'g', quantity: '4 pack (300g)' }, // M&S Green Olive Ciabatta Rolls 4s
  '00396516': { price: 4.25, qty: 400, unit: 'g', quantity: '400g' }, // M&S Beef Cannelloni Ready Meal 400g

  // 132 to 150 (Tiptree / Wilkin & Sons Preserves & Jams)
  '0043641760070': { price: 3.30, qty: 340, unit: 'g', quantity: '340g' }, // Tiptree Strawberry Conserve 340g
  '0043647020017': { price: 3.40, qty: 340, unit: 'g', quantity: '340g' }, // Wilkin & Sons Black Cherry Conserve 340g
  '0043647130013': { price: 3.30, qty: 340, unit: 'g', quantity: '340g' }, // Tiptree Pure Raspberry Jam 340g
  '0043647140012': { price: 3.50, qty: 340, unit: 'g', quantity: '340g' }, // Wilkin & Sons Tiny Tip Raspberry Conserve 340g
  '0043647150011': { price: 4.80, qty: 340, unit: 'g', quantity: '340g' }, // Tiptree Little Scarlet Strawberry Jam 340g
  '0043647160010': { price: 3.30, qty: 340, unit: 'g', quantity: '340g' }, // Wilkin & Sons Strawberry Preserve 340g
  '0043647190017': { price: 3.30, qty: 340, unit: 'g', quantity: '340g' }, // Tiptree Raspberry Seedless Jam 340g
  '0043647340016': { price: 3.20, qty: 340, unit: 'g', quantity: '340g' }, // Tiptree Pure Ginger Jam 340g
  '0043647380012': { price: 3.10, qty: 340, unit: 'g', quantity: '340g' }, // Tiptree Orange Medium Cut Marmalade 340g
  '0043647390011': { price: 3.20, qty: 340, unit: 'g', quantity: '340g' }, // Wilkin & Sons Tawny Thick Cut Marmalade 340g
  '0043647400017': { price: 3.10, qty: 340, unit: 'g', quantity: '340g' }, // Tiptree Crystal Orange Marmalade Fine 340g
  '0043647410016': { price: 3.20, qty: 340, unit: 'g', quantity: '340g' }, // Tiptree Pure Orange & Tangerine Marmalade 340g
  '0043647410023': { price: 3.85, qty: 454, unit: 'g', quantity: '454g' }, // Tiptree Orange & Tangerine Marmalade 454g
  '0043647440013': { price: 3.10, qty: 340, unit: 'g', quantity: '340g' }, // Tiptree Orange Marmalade Fine Cut 340g
  '0043647440020': { price: 3.85, qty: 454, unit: 'g', quantity: '454g' }, // Tiptree Old Times Fine Cut Marmalade 454g
  '0043647440075': { price: 0.85, qty: 42, unit: 'g', quantity: '42g mini' }, // Tiptree Orange Marmalade Mini Jar 42g
  '0043647460011': { price: 3.10, qty: 340, unit: 'g', quantity: '340g' }, // Tiptree Orange Marmalade No Peel 340g
  '0043647460028': { price: 3.85, qty: 454, unit: 'g', quantity: '454g' }, // Tiptree Orange Marmalade No Peel 454g
  '0043647680037': { price: 3.20, qty: 312, unit: 'g', quantity: '312g' }, // Tiptree Lemon Curd 312g

  // 151 to 176
  '00407779': { price: 0.75, qty: 400, unit: 'g', quantity: '400g' }, // by Sainsbury's Whole Green Beans in Water 400g
  '00411202': { price: 0.90, qty: 25, unit: 'g', quantity: '25g' }, // Cook with M&S Fresh Thyme 25g
  '00421102': { price: 3.25, qty: 115, unit: 'g', quantity: '115g' }, // M&S Collection Wiltshire Honey Roast Ham 115g
  '00425896': { price: 0.65, qty: 2, unit: 'l', quantity: '2L' }, // By Sainsbury's Cumbrian Still Water 2L
  '00426374': { price: 0.75, qty: 1, unit: 'piece', quantity: '1 head' }, // by Sainsbury's British Round Lettuce
  '00441865': { price: 1.75, qty: 170, unit: 'g', quantity: '2 pack (170g)' }, // M&S Iced & Spiced Fruited Buns 2s
  '00457149': { price: 1.30, qty: 400, unit: 'g', quantity: '400g' }, // by Sainsbury’s British Shallots 400g
  '00463348': { price: 2.25, qty: 1, unit: 'l', quantity: '1L' }, // M&S Pure Squeezed Clementine Juice 1L
  '00473323': { price: 4.25, qty: 180, unit: 'g', quantity: '2 fillets (180g)' }, // M&S Mediterranean Sea Bass Fillets 180g
  '00486682': { price: 1.00, qty: 250, unit: 'g', quantity: '250g' }, // M&S Microwave Wholegrain Rice Pouch 250g
  '00498012': { price: 1.65, qty: 1, unit: 'l', quantity: '1L' }, // Simply M&S Smooth Orange Juice 1L
  '00506267': { price: 1.85, qty: 140, unit: 'g', quantity: '140g' }, // M&S Eat Well Rosa Verde Salad Bag 140g
  '00516167': { price: 2.65, qty: 300, unit: 'g', quantity: '300g' }, // Simply M&S Thick Cut Unsmoked Back Bacon 300g
  '00518949': { price: 1.40, qty: 360, unit: 'g', quantity: '4 pack (360g)' }, // M&S Soft Wholemeal Rolls 4s
  '00519830': { price: 1.75, qty: 1000, unit: 'g', quantity: '1kg' }, // by Sainsbury's British Fine Green Beans Frozen 1kg
  '00528605': { price: 4.75, qty: 4, unit: 'piece', quantity: '4 pack' }, // M&S The Grill 4 Lamb Shish Kebabs 4s
  '00529570': { price: 2.25, qty: 1, unit: 'l', quantity: '1L' }, // M&S Pressed Red Grape Pomegranate Juice 1L
  '00566049': { price: 3.50, qty: 220, unit: 'g', quantity: '220g' }, // M&S Collection Dry Cured Smoked Bacon 220g
  '00573856': { price: 2.50, qty: 25, unit: 'g', quantity: '25g' }, // Cook with M&S Dried Porcini Mushrooms 25g
  '00574419': { price: 3.50, qty: 185, unit: 'g', quantity: '9 pack (185g)' }, // M&S Collection 9 Stollen Bites 185g
  '00613385': { price: 3.25, qty: 250, unit: 'g', quantity: '250g' }, // Cook with M&S Chicken & 4 Cheese Ravioli 250g
  '00615068': { price: 2.20, qty: 500, unit: 'g', quantity: '500g' }, // M&S Organic Greek Style Yoghurt 500g
  '00618236': { price: 3.00, qty: 115, unit: 'g', quantity: '115g' }, // M&S Food Collection Wafer Thin Roasted Ham 115g
  '00620833': { price: 2.00, qty: 1000, unit: 'g', quantity: '1kg' }, // Cook with M&S Gluten Free Plain Flour 1kg
  '00635981': { price: 1.50, qty: 1, unit: 'l', quantity: '1L' }, // Sainsbury's Refreshing Pineapple Juice 1L
  '00683036': { price: 5.00, qty: 240, unit: 'g', quantity: '2 fillets (240g)' }, // M&S Caledonian Gold Salmon Fillets 240g

  // 177 to 192 (Twinings Teas)
  '0070177029630': { price: 3.20, qty: 100, unit: 'g', quantity: '100g' }, // Twinings English Breakfast Loose Tea 100g
  '0070177067731': { price: 2.25, qty: 40, unit: 'g', quantity: '20 teabags (40g)' }, // Twinings Mango & Strawberry 20s
  '0070177067762': { price: 2.25, qty: 30, unit: 'g', quantity: '20 teabags (30g)' }, // Twinings Pure Camomile 20s
  '0070177067779': { price: 2.25, qty: 40, unit: 'g', quantity: '20 teabags (40g)' }, // Twinings Pure Peppermint 20s
  '0070177071349': { price: 2.50, qty: 50, unit: 'g', quantity: '20 teabags (50g)' }, // Twinings Orange & Cinnamon Tea 20s
  '0070177075095': { price: 2.25, qty: 25, unit: 'g', quantity: '20 teabags (25g)' }, // Twinings Camomile & Spiced Apple 20s
  '0070177075101': { price: 2.25, qty: 30, unit: 'g', quantity: '20 teabags (30g)' }, // Twinings Lemon & Ginger Tea 20s
  '0070177079239': { price: 2.25, qty: 20, unit: 'g', quantity: '20 teabags (20g)' }, // Twinings Pure Camomile 20s
  '0070177098940': { price: 2.25, qty: 40, unit: 'g', quantity: '20 teabags (40g)' }, // Twinings Cranberry & Raspberry 20s
  '0070177103088': { price: 2.25, qty: 50, unit: 'g', quantity: '20 teabags (50g)' }, // Twinings Pure Green Tea 20s
  '0070177109868': { price: 2.25, qty: 40, unit: 'g', quantity: '20 teabags (40g)' }, // Twinings Invigorating Peppermint 20s
  '0070177115227': { price: 2.25, qty: 30, unit: 'g', quantity: '20 teabags (30g)' }, // Twinings Camomile & Honey 20s
  '0070177115715': { price: 2.50, qty: 35, unit: 'g', quantity: '20 teabags (35g)' }, // Twinings Echinacea & Raspberry 20s
  '0070177182168': { price: 5.50, qty: 250, unit: 'g', quantity: '250g' }, // Twinings Earl Grey Loose Leaf 250g
  '0070177198435': { price: 2.25, qty: 35, unit: 'g', quantity: '20 teabags (35g)' }, // Twinings Ginger 20s
  '0070177233556': { price: 4.80, qty: 160, unit: 'g', quantity: '80 teabags (160g)' }, // Twinings Pure Peppermint 80s

  // 193 to 196 (Maryland & Cadbury)
  '0072417136160': { price: 1.50, qty: 230, unit: 'g', quantity: '230g' }, // Maryland Choc Chip Cookies 230g
  '0072417153051': { price: 1.65, qty: 114, unit: 'g', quantity: '114g' }, // Cadbury Fingers Milk Chocolate Biscuits 114g
  '0072417159152': { price: 2.75, qty: 228, unit: 'g', quantity: '228g' }, // Cadbury Fingers Twin Pack 228g
  '0072417161575': { price: 1.65, qty: 114, unit: 'g', quantity: '114g' }, // Cadbury Milk Chocolate Covered Fingers 114g

  // 197 to 223
  '00708470': { price: 2.10, qty: 500, unit: 'ml', quantity: '500ml' }, // Adnams Southwold Summer Beer 500ml
  '00719599': { price: 1.25, qty: 250, unit: 'g', quantity: '250g' }, // Cook with M&S Sea Salt Crystals 250g
  '00722728': { price: 1.75, qty: 150, unit: 'g', quantity: '150g' }, // M&S Four Cheese & Red Onion Crisps 150g
  '00734899': { price: 0.90, qty: 25, unit: 'g', quantity: '25g' }, // Cook with M&S Fresh Rosemary 25g
  '00737531': { price: 1.50, qty: 50, unit: 'g', quantity: '50g' }, // Cook with M&S Roast Potato Seasoning 50g
  '00741316': { price: 1.00, qty: 300, unit: 'g', quantity: '300g' }, // Simply M&S Rich Tea Biscuits 300g
  '00741408': { price: 2.85, qty: 100, unit: 'g', quantity: '100g' }, // Simply M&S Colombian Instant Coffee 100g
  '00788298': { price: 6.50, qty: 360, unit: 'g', quantity: '4 chops (360g)' }, // Simply M&S 4 British Lamb Loin Chops
  '00788632': { price: 0.95, qty: 2, unit: 'piece', quantity: '2 stems' }, // Cook with M&S Fresh Lemongrass 2 stems
  '0088162149805': { price: 2.60, qty: 160, unit: 'g', quantity: '160g' }, // Waitrose Duchy Originals Shortbread 160g
  '00812726': { price: 2.50, qty: 227, unit: 'g', quantity: '227g punnet' }, // M&S Eat Well British Strawberries 227g
  '00816700': { price: 2.00, qty: 6, unit: 'piece', quantity: '6 pack' }, // Simply M&S Seedless Navel Oranges 6 pack
  '00840460': { price: 5.50, qty: 1.5, unit: 'kg', quantity: '1.5kg' }, // M&S British Oakham Whole Chicken 1.5kg
  '00848503': { price: 0.90, qty: 300, unit: 'g', quantity: '300g' }, // M&S Eat Well Fresh Broccoli Head 300g
  '00850148': { price: 1.85, qty: 200, unit: 'g', quantity: '200g' }, // M&S Eat Well Baby Courgettes 200g
  '00869225': { price: 2.40, qty: 1, unit: 'l', quantity: '1L' }, // M&S British Goat's Milk 1L
  '00875059': { price: 1.10, qty: 200, unit: 'g', quantity: '200g' }, // Simply M&S Shortcake Biscuits 200g
  '00879231': { price: 1.95, qty: 340, unit: 'g', quantity: '340g' }, // M&S Tikka Masala Curry Sauce 340g
  '0099845103335': { price: 4.25, qty: 303, unit: 'g', quantity: '2 steaks (303g)' }, // Gloucester Old Spot 2 Pork Steaks
  '00902182': { price: 0.80, qty: 125, unit: 'g', quantity: '125g bunch' }, // Simply M&S Salad Spring Onions 125g
  '00953191': { price: 0.90, qty: 25, unit: 'g', quantity: '25g' }, // Cook with M&S Curled Parsley 25g
  '00960328': { price: 3.25, qty: 246, unit: 'g', quantity: '9 pack (246g)' }, // M&S Collection Mini Mince Pies 246g
  '00965835': { price: 2.00, qty: 250, unit: 'ml', quantity: '250ml' }, // M&S Vanilla Bean & Maple Smoothie 250ml
  '00969963': { price: 2.75, qty: 350, unit: 'g', quantity: '350g' }, // M&S Porridge with Berry Compote 350g
  '00995634': { price: 3.75, qty: 400, unit: 'g', quantity: '6 pack (400g)' }, // M&S 6 Pork & Caramelised Onion Sausages
  '01056280': { price: 1.10, qty: 150, unit: 'g', quantity: '150g pot' }, // Sainsbury's TTD Raspberry & Cream Yogurt
  '01058963': { price: 2.25, qty: 2.5, unit: 'kg', quantity: '2.5kg' }, // by Sainsbury's Desiree Potatoes 2.5kg
};

console.log(`Loaded pricing dictionary for ${Object.keys(UK_PRICING_MAP).length} items.`);

let updatedCount = 0;
for (const p of data.products) {
  const code = String(p.code).trim();
  const pricing = UK_PRICING_MAP[code];
  if (pricing) {
    p.price = pricing.price;
    p.currency = 'GBP';
    if (pricing.qty) p.product_quantity = pricing.qty;
    if (pricing.unit) p.product_quantity_unit = pricing.unit;
    if (pricing.quantity) p.quantity = pricing.quantity;
    updatedCount++;
  }
}

fs.writeFileSync(PRODUCTS_JSON_PATH, JSON.stringify(data, null, 2), 'utf-8');
console.log(`Updated pricing for ${updatedCount} products in products.json!`);

// Verify if any remaining zero prices
const remainingZero = data.products.filter((p) => !p.price || p.price === 0);
console.log(`Remaining products with price 0: ${remainingZero.length}`);
if (remainingZero.length > 0) {
  console.log('Unpriced items:', remainingZero.map((p) => `[${p.code}] ${p.product_name}`));
}
