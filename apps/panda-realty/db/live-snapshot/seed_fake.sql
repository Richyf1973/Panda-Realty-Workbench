-- Workbench test data. ALL names, addresses and amounts are invented.
set search_path = panda_realty, public;

insert into entity_categories (entity_category_id, entity_category_name)
overriding system value values (1,'Buyer'),(2,'Seller'),(3,'Tenant'),(4,'Contact')
on conflict do nothing;

insert into property_status (property_status_code, property_status, pipeline, sort_order, is_shown_on_favorite) values
 ('To Be Appraised','To Be Appraised','sellers',1,true),
 ('Appraised','Appraised','sellers',2,true),
 ('On The Market','On The Market','sellers',3,true),
 ('Contract Signed / Conditions','Contract Signed / Conditions','sellers',4,true),
 ('Unconditional','Unconditional','sellers',5,true),
 ('Settled-Sellers','Settled-Sellers','sellers',6,true),
 ('Enquiry','Enquiry','buyers',1,false),
 ('Offer Made','Offer Made','buyers',2,false)
on conflict do nothing;

insert into panda_properties (street_address, suburb, state, postcode, property_type, bed, bath, car,
  is_favorite, owner1name, owner1email, owner1phone, property_status_id, commission_rate)
select v.street_address,v.suburb,v.state,v.postcode,v.property_type,v.bed,v.bath,v.car,v.is_favorite,v.owner1name,v.owner1email,v.owner1phone, (select property_status_id from property_status where property_status_code = v.st), 2.2
from (values
 ('12 TESTING LANE','SAMPLEVILLE','QLD','4999','House',4,2,2,true,'ALEX SAMPLE','alex@example.test','0400000001','Contract Signed / Conditions'),
 ('7 DEMO STREET','MOCKTON','QLD','4998','House',3,1,1,true,'JORDAN DEMO','jordan@example.test','0400000002','On The Market'),
 ('3/88 PRETEND ROAD','FICTION BAY','QLD','4997','Unit',2,1,1,true,'CASEY PRETEND','casey@example.test','0400000003','Appraised')
) as v(street_address,suburb,state,postcode,property_type,bed,bath,car,is_favorite,owner1name,owner1email,owner1phone,st)
on conflict do nothing;

insert into entities (entity_category_id, entity_name, email_address, contact) values
 (1,'TAYLOR EXAMPLE','taylor@example.test','0400000010'),
 (1,'MORGAN PLACEHOLDER','morgan@example.test','0400000011');

insert into property_entities (property_list_id, entity_id)
select p.property_list_id, e.entity_id from panda_properties p, entities e
where p.street_address = '12 TESTING LANE' and e.entity_name = 'TAYLOR EXAMPLE';
