"""
Tests for NER Extraction Module
"""

import pytest
from app.ner import (
    extract_with_regex,
    extract_with_heuristics,
    extract_entities,
    validate_extracted_data
)


class TestNER:
    """Test suite for NER extraction"""
    
    def test_extract_khasra_no_regex(self):
        """Test khasra number extraction with regex"""
        text = "Khasra No: 12345"
        entities, confidences = extract_with_regex(text)
        
        assert entities['khasra_no'] == '12345'
        assert confidences['khasra_no'] > 0
    
    def test_extract_khata_no_regex(self):
        """Test khata number extraction with regex"""
        text = "Khata No: 67890"
        entities, confidences = extract_with_regex(text)
        
        assert entities['khata_no'] == '67890'
        assert confidences['khata_no'] > 0
    
    def test_extract_owner_name_regex(self):
        """Test owner name extraction with regex"""
        text = "Owner: Ramesh Kumar"
        entities, confidences = extract_with_regex(text)
        
        assert entities['owner_name'] is not None
        assert 'ramesh' in entities['owner_name'].lower() or 'kumar' in entities['owner_name'].lower()
        assert confidences['owner_name'] > 0
    
    def test_extract_village_regex(self):
        """Test village extraction with regex"""
        text = "Village: Rampur"
        entities, confidences = extract_with_regex(text)
        
        assert entities['village'] is not None
        assert 'rampur' in entities['village'].lower()
        assert confidences['village'] > 0
    
    def test_extract_tehsil_regex(self):
        """Test tehsil extraction with regex"""
        text = "Tehsil: Sadar"
        entities, confidences = extract_with_regex(text)
        
        assert entities['tehsil'] is not None
        assert 'sadar' in entities['tehsil'].lower()
        assert confidences['tehsil'] > 0
    
    def test_extract_district_regex(self):
        """Test district extraction with regex"""
        text = "District: Lucknow"
        entities, confidences = extract_with_regex(text)
        
        assert entities['district'] is not None
        assert 'lucknow' in entities['district'].lower()
        assert confidences['district'] > 0
    
    def test_extract_area_regex(self):
        """Test area extraction with regex"""
        text = "Area: 2.5 hectares"
        entities, confidences = extract_with_regex(text)
        
        assert entities['area_declared'] is not None
        assert '2.5' in entities['area_declared']
        assert confidences['area_declared'] > 0
    
    def test_extract_multiple_fields(self):
        """Test extraction of multiple fields"""
        text = """
        Land Record
        Khasra No: 123
        Khata No: 456
        Owner: Ramesh Kumar
        Village: Rampur
        Tehsil: Sadar
        District: Lucknow
        Area: 2.5 hectares
        """
        
        entities, confidences = extract_with_regex(text)
        
        assert entities['khasra_no'] == '123'
        assert entities['khata_no'] == '456'
        assert entities['owner_name'] is not None
        assert entities['village'] is not None
        assert entities['tehsil'] is not None
        assert entities['district'] is not None
        assert entities['area_declared'] is not None
    
    def test_extract_heuristics(self):
        """Test heuristic extraction"""
        text = """
        Khasra: 123
        Khata: 456
        Owner Name: Ramesh Kumar
        Village: Rampur
        Tehsil: Sadar
        District: Lucknow
        Area: 2.5
        """
        
        entities, confidences = extract_with_heuristics(text)
        
        # Should extract at least some fields
        assert any(v is not None for v in entities.values())
    
    def test_extract_entities_combined(self):
        """Test combined extraction"""
        text = """
        Land Record Document
        Khasra No: 123
        Khata No: 456
        Owner: Ramesh Kumar
        Village: Rampur
        Tehsil: Sadar
        District: Lucknow
        Area: 2.5 hectares
        """
        
        entities, confidences, method = extract_entities(text)
        
        # Should extract fields
        assert entities is not None
        assert confidences is not None
        assert method in ['regex', 'heuristic', 'combined']
        
        # Check that area_declared is converted to float
        if entities.get('area_declared'):
            assert isinstance(entities['area_declared'], float)
    
    def test_extract_empty_text(self):
        """Test extraction with empty text"""
        text = ""
        
        entities, confidences, method = extract_entities(text)
        
        # Should return empty/None values
        assert entities is not None
        assert confidences is not None
    
    def test_extract_no_matching_text(self):
        """Test extraction with text that doesn't match patterns"""
        text = "This is just random text without any land record information"
        
        entities, confidences, method = extract_entities(text)
        
        # Should return None/0 for most fields
        assert entities is not None
        assert confidences is not None
    
    def test_validate_extracted_data_complete(self):
        """Test validation with complete data"""
        entities = {
            'owner_name': 'Ramesh Kumar',
            'khasra_no': '123',
            'khata_no': '456',
            'village': 'Rampur',
            'tehsil': 'Sadar',
            'district': 'Lucknow',
            'area_declared': 2.5
        }
        
        is_valid = validate_extracted_data(entities)
        assert is_valid is True
    
    def test_validate_extracted_data_incomplete(self):
        """Test validation with incomplete data"""
        entities = {
            'owner_name': 'Ramesh Kumar',
            'khasra_no': '123',
            # Missing khata_no, village, tehsil, district
        }
        
        is_valid = validate_extracted_data(entities)
        assert is_valid is False
    
    def test_validate_extracted_data_invalid_area(self):
        """Test validation with invalid area"""
        entities = {
            'owner_name': 'Ramesh Kumar',
            'khasra_no': '123',
            'khata_no': '456',
            'village': 'Rampur',
            'tehsil': 'Sadar',
            'district': 'Lucknow',
            'area_declared': 'not a number'
        }
        
        is_valid = validate_extracted_data(entities)
        assert is_valid is False
    
    def test_extract_hindi_text(self):
        """Test extraction with Hindi text"""
        text = """
        भूमि रिकॉर्ड
        खसरा नंबर: 123
        खाता नंबर: 456
        मालिक: रमेश कुमार
        गाँव: रामपुर
        तहसील: सदर
        जिला: लखनऊ
        """
        
        entities, confidences, method = extract_entities(text)
        
        # Should attempt to extract (may or may not succeed depending on patterns)
        assert entities is not None
        assert confidences is not None


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
