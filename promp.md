I want to create a rpc function to help me update an existing package, following are the data post data from the user. The main id name,duration can be used to update the value in the db directly .

Howerever hotel, room, inclusion and exclusion needs to be proccessed first

- Updating hotel proccess

1. Pull hotel templates from this table public.hotel_templates

2. Using the value gotten here as guide, iterate over the post data, and access the value as necessary

3. Check if the room a hotel_type cannot be found in the post data it means a default value for the hotel have not yet been crated for the package in table package_hotel. If so create one and move on to the next hotel

/_there will be an import feature, this condition is to ensure if the hotel id from the feature causes the hotel id of the current post data get overwrite is does not update the wrong record_/

4. If the hotel_type does exist in the post data, quickly check in package_hotel table, if the hotel_id in the post data is linked to the same package_id as in the post data.

5. If it does not, it means we need to create a new package_hotel record using the hotel_templates as temporary variable so we have the proper structure to work with before updating the db . Using the hotel value gotten from the post data. Populate name and meal of the hotel into the temporary variable . Iterate over each meals and check in the package_meals table if this particular meal is linked to a package_id, if it does use the data from the post to populate the temporay variable before insert it into the table 8. If it meals in the post data have been

{

    "id": "4d22f4e9-13d2-4b9e-b929-5d4a0a9af36b",

    "name": "MANASIK HAJI",

    "duration": "12 Days 10 Nights",

    "hotels.makkah.id": "7d1e01bc-5cc2-400e-81b1-97c9dd6f295e",

    "hotels.makkah.name": "Hotel Menara Jam (Movenpick) @ setaraf (50m+/-) 5 star (MANASIK HAJI)",

    "hotels.makkah.meals": "BREAKFAST",

    "hotels.madinah.id": "e408b2e3-efdc-4f69-83b3-7c646d8f5bf9",

    "hotels.madinah.name": "Hotel Nozol Royal Inn @ setaraf (150m+/-) 4 star (MANASIK HAJI)",

    "hotels.madinah.meals": "BREAKFAST,DINNER,LUNCH",

    "inclusions": "TIKET PENERBANGAN ANTARABANGSA\nPENGINAPAN SEPANJANG PROGRAM\nMUTAWWIF DARI MALAYSIA\nKAD PERUBATAN\nVISA UMRAH/PELANCONG\nPERKARA LAIN YANG DISEBUTKAN DIDALAM SEBUTHARGA SAHAJA\nAYAM GORENG MCD",

    "exclusions": "PERBELANJAAN HARIAN, DOBI\nPERKHIDMATAN TAMBAHAN PIHAK HOTEL\nPERKARA-PERKARA LAIN YANG TIDAK DISEBUT DALAM SEBUTHARGA\nLEBIHAN BAGASI (BERAT MELEBIHI HAD YANG TELAH DITETAPKAN OLEH PIHAK SYARIKAT PENERBANGAN)\nAYAM BARAK MCD",

    "rooms.0.enabled": "true",

    "rooms.0.id": "5abffbe8-9365-41c3-abf3-058f65a0f3a8",

    "rooms.0.price": "0",

    "rooms.1.enabled": "true",

    "rooms.1.id": "06666de6-2bb7-432f-9af3-b1a8766db592",

    "rooms.1.price": "0",

    "rooms.2.enabled": "true",

    "rooms.2.id": "922fe063-2736-4977-98cf-5c9df2cd1166",

    "rooms.2.price": "0",

    "rooms.3.enabled": "true",

    "rooms.3.id": "c7998b2e-9184-41ec-9042-f1b659660309",

    "rooms.3.price": "0",

    "rooms.4.enabled": "false",

    "rooms.4.id": "398467e0-f92b-4c63-81e9-96a38307acff"

}

notice how each of the
