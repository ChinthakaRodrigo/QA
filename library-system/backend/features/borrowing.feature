Feature: Borrowing books
  As a library member
  I want to borrow books online
  So that I can read them at home, as long as I stay within the borrowing limit

  Background:
    Given I am logged in as the member "jane@library.com" with password "Member123"

  Scenario: Member borrows an available book
    Given the book "Clean Code" has 3 copies available
    When I borrow "Clean Code"
    Then the loan is created with status "borrowed"
    And the book is due 14 days from today
    And the book "Clean Code" has 2 copies available

  Scenario: Member cannot borrow a fourth book
    Given I have already borrowed these books:
      | title                    |
      | Clean Code               |
      | The Pragmatic Programmer |
      | Refactoring              |
    When I borrow "Domain-Driven Design"
    Then the request is refused with status 400
    And I see the error "You cannot borrow more than 3 books at a time"
    And I have 3 books on loan
