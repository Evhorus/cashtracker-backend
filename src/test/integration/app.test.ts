import request from 'supertest';
import server, { connectDB } from '../../server';
import { AuthController } from '../../controllers/auth.controller';
import User from '../../models/user.model';
import * as authUtils from '../../utils/auth';
import * as jwtUtils from '../../utils/jwt';

describe('Authentication - Create Account', () => {
  it('should display validation errors when form is empty', async () => {
    const response = await request(server)
      .post('/api/v1/auth/create-account')
      .send({});
    const createAccountMock = jest.spyOn(AuthController, 'createAccount');
    expect(response.statusCode).toBe(400);
    expect(response.body).toHaveProperty('errors');
    expect(response.body.errors).toHaveLength(3);
    expect(response.status).not.toBe(201);
    expect(createAccountMock).not.toHaveBeenCalled();
  });

  it('should return 400 status code when the email is invalid', async () => {
    const response = await request(server)
      .post('/api/v1/auth/create-account')
      .send({
        name: 'Sebastian',
        password: 'password',
        email: 'not-valid-email',
      });
    const createAccountMock = jest.spyOn(AuthController, 'createAccount');
    expect(response.statusCode).toBe(400);
    expect(response.body).toHaveProperty('errors');
    expect(response.body.errors).toHaveLength(1);
    expect(response.body.errors[0].msg).toBe('Invalid email');
    expect(response.status).not.toBe(201);
    expect(createAccountMock).not.toHaveBeenCalled();
  });

  it('should return 400 when the password is less than 8 characters', async () => {
    const response = await request(server)
      .post('/api/v1/auth/create-account')
      .send({ name: 'Sebastian', password: 'short', email: 'test@test.com' });
    const createAccountMock = jest.spyOn(AuthController, 'createAccount');
    expect(response.statusCode).toBe(400);
    expect(response.body).toHaveProperty('errors');
    expect(response.body.errors).toHaveLength(1);
    expect(response.body.errors[0].msg).toBe(
      'Password is too short, minimum 8 characters',
    );
    expect(response.status).not.toBe(201);
    expect(createAccountMock).not.toHaveBeenCalled();
  });

  it('should register a new user successfully', async () => {
    const userData = {
      name: 'test',
      password: 'password',
      email: 'test@test.com',
    };

    const response = await request(server)
      .post('/api/v1/auth/create-account')
      .send(userData);
    expect(response.statusCode).toBe(201);
    expect(response.body).toBe('Account created successfully');

    expect(response.status).not.toBe(400);
    expect(response.body).not.toHaveProperty('errors');
  });

  it('should return 409 conflict when a user is already registered', async () => {
    const userData = {
      name: 'test',
      password: 'password',
      email: 'test@test.com',
    };

    const response = await request(server)
      .post('/api/v1/auth/create-account')
      .send(userData);
    expect(response.statusCode).toBe(409);
    expect(response.body).toEqual({
      error: `A user with the email ${userData.email} is already registered`,
    });

    expect(response.status).not.toBe(400);
    expect(response.status).not.toBe(201);
    expect(response.body).not.toHaveProperty('errors');
  });
});

describe('Authentication - Account Confirmation with token', () => {
  it('should display error if token is empty or invalid', async () => {
    const response = await request(server)
      .post('/api/v1/auth/confirm-account')
      .send({ token: 'not_valid' });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('errors');
    expect(response.body.errors).toHaveLength(1);
    expect(response.body.errors[0].msg).toBe('Invalid token');
  });

  it('should display error if token does not exist', async () => {
    const response = await request(server)
      .post('/api/v1/auth/confirm-account')
      .send({ token: '123456' });

    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error).toBe('Invalid token');
    expect(response.status).not.toBe(200);
  });

  it('should confirm account with a valid token', async () => {
    const token = globalThis.cashTrackerConfirmationToken;
    const response = await request(server)
      .post('/api/v1/auth/confirm-account')
      .send({ token });
    expect(response.statusCode).toBe(200);
    expect(response.body).toBe('Account successfully confirmed');
    expect(response.statusCode).not.toBe(400);
  });
});

describe('Authentication - Login', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should display validation errors when the form is empty', async () => {
    const response = await request(server).post('/api/v1/auth/login').send({});
    const loginMock = jest.spyOn(AuthController, 'login');

    expect(response.statusCode).toBe(400);
    expect(response.body).toHaveProperty('errors');
    expect(response.body.errors).toHaveLength(2);
    expect(loginMock).not.toHaveBeenCalled();
  });

  it('should return 400 bad request when the email is invalid', async () => {
    const response = await request(server).post('/api/v1/auth/login').send({
      email: 'not_valid',
      password: 'password',
    });

    const loginMock = jest.spyOn(AuthController, 'login');

    expect(response.statusCode).toBe(400);
    expect(response.body).toHaveProperty('errors');
    expect(response.body.errors).toHaveLength(1);
    expect(response.body.errors[0].msg).toBe('Invalid email');
    expect(loginMock).not.toHaveBeenCalled();
  });

  it('should return 404 if the user is not found', async () => {
    const userData = {
      email: 'user_not_found@test.com',
      password: 'password',
    };

    const response = await request(server)
      .post('/api/v1/auth/login')
      .send(userData);

    expect(response.statusCode).toBe(404);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error).toBe(
      `User with email ${userData.email} not found`,
    );
  });

  it('should return 403 if the user account is not confirmed', async () => {
    (jest.spyOn(User, 'findOne') as jest.Mock).mockResolvedValue({
      id: 1,
      confirmed: false,
      password: 'hashedPassword',
      email: 'user_not_confirmed@test.com',
    });

    const response = await request(server).post('/api/v1/auth/login').send({
      email: 'user_not_confirmed@test.com',
      password: 'password',
    });

    expect(response.statusCode).toBe(403);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error).toBe('The account has not been confirmed');
  });

  it('should return 403 if a newly created account is not confirmed', async () => {
    const userData = {
      name: 'Test',
      email: 'user_not_confirmed@test.com',
      password: 'password',
    };

    await request(server).post('/api/v1/auth/create-account').send(userData);

    const response = await request(server).post('/api/v1/auth/login').send({
      email: userData.email,
      password: userData.password,
    });

    expect(response.statusCode).toBe(403);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error).toBe('The account has not been confirmed');
  });

  it('should return 401 if the password is incorrect', async () => {
    const findOne = (
      jest.spyOn(User, 'findOne') as jest.Mock
    ).mockResolvedValue({
      id: 1,
      confirmed: true,
      password: 'hashedPassword',
      email: 'user@test.com',
    });

    const checkPassword = jest
      .spyOn(authUtils, 'checkPassword')
      .mockResolvedValue(false);

    const response = await request(server).post('/api/v1/auth/login').send({
      email: 'user@test.com',
      password: 'wrongPassword',
    });

    expect(response.statusCode).toBe(401);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error).toBe('Incorrect password or email');

    expect(findOne).toHaveBeenCalledTimes(1);
    expect(checkPassword).toHaveBeenCalledTimes(1);

    expect(response.status).not.toBe(200);
    expect(response.status).not.toBe(404);
    expect(response.status).not.toBe(403);
  });
  it('should return a jwt', async () => {
    const findOne = (
      jest.spyOn(User, 'findOne') as jest.Mock
    ).mockResolvedValue({
      id: 1,
      confirmed: true,
      password: 'hashedPassword',
      email: 'user@test.com',
    });

    const checkPassword = jest
      .spyOn(authUtils, 'checkPassword')
      .mockResolvedValue(true);

    const generateJWT = jest
      .spyOn(jwtUtils, 'generateJWT')
      .mockReturnValue('jwt_token');

    const response = await request(server).post('/api/v1/auth/login').send({
      email: 'user@test.com',
      password: 'correctPassword',
    });

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual('jwt_token');
    expect(findOne).toHaveBeenCalledTimes(1);
    expect(checkPassword).toHaveBeenCalledTimes(1);
    expect(checkPassword).toHaveBeenCalledWith(
      'correctPassword',
      'hashedPassword',
    );
    expect(generateJWT).toHaveBeenCalledTimes(1);
    expect(generateJWT).toHaveBeenCalledWith(1);
  });
});

let jwt: string;

const authenticateUser = async () => {
  const response = await request(server)
    .post('/api/v1/auth/login')
    .send({ email: 'test@test.com', password: 'password' });
  jwt = response.body;

  expect(response.statusCode).toBe(200);
};

describe('GET /api/v1/budgets', () => {
  beforeAll(() => {
    jest.restoreAllMocks();
  });

  beforeAll(async () => {
    await authenticateUser();
  });

  it('should reject unauthenticated access to budgets without a jwt', async () => {
    const response = await request(server).get('/api/v1/budgets');

    expect(response.statusCode).toBe(401);
    expect(response.body.error).toBe('Unauthorized');
  });
  it('should reject authenticated access to budgets without a valid valid jwt', async () => {
    const response = await request(server)
      .get('/api/v1/budgets')
      .auth('not_valid', { type: 'bearer' });

    expect(response.statusCode).toBe(500);
    expect(response.body.error).toBe('Invalid Token');
  });
  it('should allow a authenticated access to budgets with a valid jwt', async () => {
    const response = await request(server)
      .get('/api/v1/budgets')
      .auth(jwt, { type: 'bearer' });

    expect(response.body).toHaveLength(0);
    expect(response.statusCode).not.toBe(401);
    expect(response.body.error).not.toBe('Unauthorized');
  });
});

describe('POST /api/v1/budgets', () => {
  beforeAll(async () => {
    await authenticateUser();
  });

  it('should reject unauthenticated post request access to budgets without a jwt', async () => {
    const response = await request(server).post('/api/v1/budgets');

    expect(response.statusCode).toBe(401);
    expect(response.body.error).toBe('Unauthorized');
  });

  it('should display validation when the form is submitted with invalid data', async () => {
    const response = await request(server)
      .post('/api/v1/budgets')
      .auth(jwt, { type: 'bearer' })
      .send({});

    expect(response.statusCode).toBe(400);
    expect(response.body.errors).toHaveLength(4);
  });
  it('should create a new budget and return a success message', async () => {
    const response = await request(server)
      .post('/api/v1/budgets')
      .auth(jwt, { type: 'bearer' })
      .send({
        name: 'Budget test',
        amount: 3000,
      });

    expect(response.statusCode).toBe(201);
    expect(response.body).toBe('Budget created successfully');
    expect(response.status).not.toBe(400);
    expect(response.status).not.toBe(401);
  });
});

describe('GET /api/v1/budgets/:id', () => {
  beforeAll(async () => {
    await authenticateUser();
  });

  it('should reject unauthenticated get request to budget id without a jwt', async () => {
    const response = await request(server).get('/api/v1/budgets/1');

    expect(response.statusCode).toBe(401);
    expect(response.body.error).toBe('Unauthorized');
  });

  it('should return 400 bad request when id is not valid', async () => {
    const response = await request(server)
      .get('/api/v1/budgets/id_not_valid')
      .auth(jwt, { type: 'bearer' });

    expect(response.statusCode).toBe(400);
    expect(response.body.errors).toBeDefined();
    expect(response.body.errors).toHaveLength(1);
    expect(response.body.errors[0].msg).toBe('Invalid ID');
    expect(response.statusCode).not.toBe(401);
    expect(response.body.error).not.toBe('Unauthorized');
  });
  it('should return 404 not found when a budget does not exists', async () => {
    const response = await request(server)
      .get('/api/v1/budgets/3000')
      .auth(jwt, { type: 'bearer' });

    expect(response.statusCode).toBe(404);
    expect(response.body.error).toBe('Budget not found');
    expect(response.statusCode).not.toBe(400);
    expect(response.statusCode).not.toBe(401);
  });

  it('should return a single budget by id', async () => {
    const response = await request(server)
      .get('/api/v1/budgets/1')
      .auth(jwt, { type: 'bearer' });

    expect(response.statusCode).toBe(200);
    expect(response.statusCode).not.toBe(400);
    expect(response.statusCode).not.toBe(401);
    expect(response.statusCode).not.toBe(404);
  });
});

describe('PUT /api/v1/budgets/:id', () => {
  beforeAll(async () => {
    await authenticateUser();
  });

  it('should reject unauthenticated get request to budget id without a jwt', async () => {
    const response = await request(server).put('/api/v1/budgets/1');

    expect(response.statusCode).toBe(401);
    expect(response.body.error).toBe('Unauthorized');
  });

  it('should display validation errors if the form is empty', async () => {
    const response = await request(server)
      .put('/api/v1/budgets/1')
      .auth(jwt, { type: 'bearer' })
      .send({});

    expect(response.statusCode).toBe(400);
    expect(response.body.errors).toBeTruthy();
    expect(response.body.errors).toHaveLength(4);
  });
  it('should update a budget by id and return a success message', async () => {
    const response = await request(server)
      .put('/api/v1/budgets/1')
      .auth(jwt, { type: 'bearer' })
      .send({ name: 'Updated Budget', amount: 3000 });

    expect(response.statusCode).toBe(200);
    expect(response.body).toBe('Budget updated successfully');
  });
});

describe('DELETE /api/v1/budgets/:id', () => {
  beforeAll(async () => {
    await authenticateUser();
  });

  it('should reject unauthenticated get request to budget id without a jwt', async () => {
    const response = await request(server).delete('/api/v1/budgets/1');

    expect(response.statusCode).toBe(401);
    expect(response.body.error).toBe('Unauthorized');
  });

  it('should return 404 not found when a budget does not exists', async () => {
    const response = await request(server)
      .delete('/api/v1/budgets/3000')
      .auth(jwt, { type: 'bearer' });

    expect(response.statusCode).toBe(404);
    expect(response.body.error).toBe('Budget not found');
  });
  it('should delete a budget and return a success message', async () => {
    const response = await request(server)
      .delete('/api/v1/budgets/1')
      .auth(jwt, { type: 'bearer' });

    expect(response.statusCode).toBe(200);
    expect(response.body).toBe('Budget deleted successfully');
  });
});
