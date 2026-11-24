Feature: Returning books and late fines
  As a library member
  I want to know what I owe when I return a book
  So that late fines are fair: $1 for each started day late, never more than $20

  Background:
    Given I am logged in as the member "jane@library.com" with password "Member123"
    And I have borrowed "Clean Code" today

  Scenario Outline: Fine depends on how late the book is returned
    Given <days> days have passed since the due date
    When I return "Clean Code"
    Then the loan status is "returned"
    And I am charged a fine of $<fine>

    Examples:
      | days | fine |
      | 0    | 0    |
      | 1    | 1    |
      | 19   | 19   |
      | 20   | 20   |
      | 21   | 20   |
