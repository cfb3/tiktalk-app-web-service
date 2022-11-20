--Remove all memebers from all contacts
DELETE FROM Contacts;

--Add Knock & Charles as Friend
INSERT INTO
	Contacts(PrimaryKey, MemberId_A, MemberId_B, Verified)
VALUES
	(DEFAULT, 73, (SELECT MemberId FROM Members WHERE Email='cfb3@uw.edu'), 1),
	(DEFAULT, 75, (SELECT MemberId FROM Members WHERE Email='cfb3@uw.edu'), 1),
	(DEFAULT, 73, (SELECT MemberId FROM Members WHERE Email='team3tiktalk2@gmail.com'), 1),
	(DEFAULT, 75, (SELECT MemberId FROM Members WHERE Email='2twinparadox@gmail.com'), 1)
RETURNING *;