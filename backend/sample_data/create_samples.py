import os
import random
from datetime import datetime, timedelta
import pandas as pd
import numpy as np

def generate_sales_data(filepath: str, num_rows: int = 1200):
    random.seed(42)
    np.random.seed(42)

    categories = {
        "Technology": ["Laptops", "Smartphones", "Monitors", "Keyboards", "Headphones"],
        "Furniture": ["Office Chairs", "Standing Desks", "Bookcases", "Filing Cabinets"],
        "Office Supplies": ["Paper Reams", "Gel Pens", "Binders", "Staplers", "Storage Boxes"]
    }
    regions = ["North America", "Europe", "Asia Pacific", "Latin America", "Middle East"]
    customer_types = ["Enterprise", "Small Business", "Consumer", "Government"]

    start_date = datetime(2023, 1, 1)
    
    rows = []
    for i in range(num_rows):
        cat = random.choice(list(categories.keys()))
        prod = random.choice(categories[cat])
        region = random.choice(regions)
        cust_type = random.choice(customer_types)
        
        # Date spread over 2 years
        date = start_date + timedelta(days=random.randint(0, 720))
        
        qty = random.randint(1, 25)
        
        # Base prices depending on category
        if cat == "Technology":
            unit_price = round(random.uniform(150, 1200), 2)
            margin = random.uniform(0.15, 0.40)
        elif cat == "Furniture":
            unit_price = round(random.uniform(80, 650), 2)
            margin = random.uniform(0.10, 0.30)
        else:
            unit_price = round(random.uniform(10, 85), 2)
            margin = random.uniform(0.20, 0.50)

        sales = round(qty * unit_price, 2)
        profit = round(sales * margin, 2)

        rows.append({
            "Date": date.strftime("%Y-%m-%d"),
            "Product": prod,
            "Category": cat,
            "Region": region,
            "Customer Segment": cust_type,
            "Sales": sales,
            "Quantity": qty,
            "Profit": profit
        })

    df = pd.DataFrame(rows)
    df.to_excel(filepath, sheet_name="Sales Performance", index=False)
    print(f"Generated {filepath} with {len(df)} rows.")

def generate_employee_data(filepath: str, num_rows: int = 450):
    random.seed(123)
    np.random.seed(123)

    departments = ["Engineering", "Sales & Marketing", "Human Resources", "Finance", "Product", "Operations"]
    locations = ["New York", "London", "Bengaluru", "Tokyo", "Berlin", "San Francisco"]
    
    first_names = ["James", "Emma", "Liam", "Olivia", "Noah", "Ava", "William", "Sophia", "Lucas", "Mia", "Aarav", "Priya", "Chen", "Yuki", "Carlos"]
    last_names = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Patel", "Sharma", "Tanaka", "Wong", "Mueller"]

    start_date = datetime(2018, 1, 1)

    rows = []
    for i in range(1, num_rows + 1):
        emp_id = f"EMP-{i:04d}"
        full_name = f"{random.choice(first_names)} {random.choice(last_names)}"
        dept = random.choice(departments)
        loc = random.choice(locations)
        age = random.randint(22, 60)
        
        # Salaries based on department & age
        base_salary = {
            "Engineering": (85000, 175000),
            "Sales & Marketing": (60000, 150000),
            "Finance": (70000, 160000),
            "Product": (80000, 165000),
            "Human Resources": (50000, 110000),
            "Operations": (55000, 120000)
        }[dept]

        salary = round(random.uniform(base_salary[0], base_salary[1]) + (age - 22) * 800, -2)
        joining_date = start_date + timedelta(days=random.randint(0, 2200))
        # Performance score 1.0 to 5.0
        perf_score = round(random.gauss(3.8, 0.7), 1)
        perf_score = max(1.0, min(5.0, perf_score))

        rows.append({
            "Employee ID": emp_id,
            "Full Name": full_name,
            "Department": dept,
            "Location": loc,
            "Age": age,
            "Salary": salary,
            "Joining Date": joining_date.strftime("%Y-%m-%d"),
            "Performance Score": perf_score
        })

    df = pd.DataFrame(rows)
    df.to_excel(filepath, sheet_name="Employee Directory", index=False)
    print(f"Generated {filepath} with {len(df)} rows.")

if __name__ == "__main__":
    sample_dir = os.path.dirname(os.path.abspath(__file__))
    os.makedirs(sample_dir, exist_ok=True)
    generate_sales_data(os.path.join(sample_dir, "sample_sales_data.xlsx"))
    generate_employee_data(os.path.join(sample_dir, "sample_employee_data.xlsx"))
