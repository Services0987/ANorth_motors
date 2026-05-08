    @staticmethod
    def analyze_inventory(msg: str, inventory: List[Dict]):
        msg = msg.lower()
        # Find Make matches
        makes = ["ford", "ram", "chevrolet", "toyota", "honda", "jeep", "dodge", "nissan", "hyundai", "kia", "bmw", "mercedes"]
        found_make = next((m for m in makes if m in msg), None)
        
        # Find Body Type matches
        types = ["truck", "suv", "sedan", "van", "coupe", "convertible"]
        found_type = next((t for t in types if t in msg), None)
        
        results = []
        if found_make:
            results = [v for v in inventory if found_make in v.get('make', '').lower()]
        elif found_type:
            results = [v for v in inventory if found_type in v.get('body_type', '').lower() or found_type in v.get('title', '').lower()]
        
        if not results and inventory:
            results = sorted(inventory, key=lambda x: x.get('price', 999999))[:3]
            
        return results, found_make or found_type
